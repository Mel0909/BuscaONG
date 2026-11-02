import prisma from "@/backend/services/db";
import type { FiltrosData } from "@/backend/schemas";
import type { Prisma } from "@/generated/prisma";
import { urlPublica } from "@/lib/armazenamento";
import { ATIVIDADE_OUTRA, DIAS_VOLUNTARIADO, formatarHorario } from "@/lib/cadastro/voluntariado";
import type { DiaFiltro } from "@/lib/mapa/filtros";
import { distanciaKm, type Bbox, type Ponto } from "@/lib/mapa/geo";
import { urgenciaAtiva } from "@/lib/ong/urgencia";

// Área pública (mapa, lista e busca). Só ONGs publicadas aparecem.
// As consultas usam o MongoDB direto (aggregateRaw/findRaw) porque o Prisma não tem
// operadores geográficos; o índice 2dsphere de `localizacaoPublica` é criado pelo pnpm db:seed.
// Tudo aqui usa só a `localizacaoPublica` (deslocada para quem mostra só o bairro): filtrar ou
// ordenar pela posição real deixaria descobrir o endereço encolhendo a área ou movendo o ponto.

/** A lista mostra as ONGs mais próximas do ponto de referência até esta distância. */
export const RAIO_LISTA_KM = 50;
const MAX_PINS = 1000;

// documento de consulta do MongoDB, no formato JSON que o Prisma aceita nas consultas cruas
type Condicao = { [chave: string]: Prisma.InputJsonValue };

// um filtro de dia aceita horários daquele dia e os que o incluem (dias úteis, fim de semana, todo dia)
const DIAS_QUE_VALEM: Record<DiaFiltro, string[]> = {
  DOMINGO: ["DOMINGO", "FIM_DE_SEMANA", "TODO_DIA"],
  SEGUNDA: ["SEGUNDA", "DIAS_UTEIS", "TODO_DIA"],
  TERCA: ["TERCA", "DIAS_UTEIS", "TODO_DIA"],
  QUARTA: ["QUARTA", "DIAS_UTEIS", "TODO_DIA"],
  QUINTA: ["QUINTA", "DIAS_UTEIS", "TODO_DIA"],
  SEXTA: ["SEXTA", "DIAS_UTEIS", "TODO_DIA"],
  SABADO: ["SABADO", "FIM_DE_SEMANA", "TODO_DIA"],
};

/**
 * Filtros da tela → condição do MongoDB. Dentro de um grupo vale qualquer opção (OU);
 * entre grupos, todos (E). No voluntariado, o mesmo horário precisa bater dia, turno e atividade.
 */
export function montarFiltro(f: FiltrosData): Condicao {
  const condicao: Condicao = { status: "PUBLICADA" };

  if (f.causas.length) condicao.causas = { $in: f.causas };

  if (f.itens.length || f.livres.length) {
    const algumItem: Condicao[] = [];
    if (f.itens.length) algumItem.push({ itens: { $in: f.itens } });
    if (f.livres.length) algumItem.push({ "itensLivres.chave": { $in: f.livres } });
    condicao.$or = algumItem;
  }

  if (f.dias.length || f.turnos.length || f.atividades.length) {
    const horario: Condicao = {};
    if (f.dias.length) horario.dia = { $in: [...new Set(f.dias.flatMap((d) => DIAS_QUE_VALEM[d]))] };
    if (f.turnos.length) horario.turnos = { $in: f.turnos };
    if (f.atividades.length) horario.atividade = { $in: f.atividades };
    condicao.aceitaVoluntarios = true;
    condicao.horariosVoluntariado = { $elemMatch: horario };
  }

  return condicao;
}

// ---- nomes das listas fixas (os documentos guardam só os slugs) ----

export type Nomes = Record<"CAUSA" | "ITEM" | "ATIVIDADE", Map<string, string>>;
const VALIDADE_NOMES_MS = 5 * 60 * 1000;
let cacheNomes: { ate: number; nomes: Nomes } | null = null;

/** Nomes das opções das listas fixas por slug (com cache de 5 minutos). */
export async function nomesDasListas(): Promise<Nomes> {
  if (cacheNomes && cacheNomes.ate > Date.now()) return cacheNomes.nomes;
  const opcoes = await prisma.opcaoLista.findMany({ select: { tipo: true, slug: true, nome: true } });
  const nomes: Nomes = { CAUSA: new Map(), ITEM: new Map(), ATIVIDADE: new Map() };
  for (const o of opcoes) nomes[o.tipo].set(o.slug, o.nome);
  cacheNomes = { ate: Date.now() + VALIDADE_NOMES_MS, nomes };
  return nomes;
}

/** Só para testes. */
export function limparCacheNomes() {
  cacheNomes = null;
}

// ---- documento cru do MongoDB → dados da tela ----

type HorarioCru = {
  dia: string;
  inicio: number | null;
  fim: number | null;
  atividade: string;
  atividadeOutra?: string | null;
  turnos: string[];
};

// datas vêm como { $date: "..." } nas consultas cruas
type DataCrua = { $date: string } | string;
type UrgenciaCrua = { item: string; nome: string; detalhe?: string | null; criadaEm: DataCrua; ate: DataCrua };

type OngCrua = {
  _id: { $oid: string } | string;
  slug?: string | null;
  nomePublico?: string | null;
  logo?: string | null;
  causas?: string[];
  itens?: string[];
  itensLivres?: { nome: string; chave: string }[];
  aceitaVoluntarios?: boolean;
  horariosVoluntariado?: HorarioCru[];
  endereco?: { bairro?: string | null; municipio?: string | null } | null;
  localizacaoPublica?: { coordinates: [number, number] } | null;
  mostrarSoBairro?: boolean;
  urgencias?: UrgenciaCrua[];
  distancia?: number;
};

const PROJECAO = {
  slug: 1,
  nomePublico: 1,
  logo: 1,
  causas: 1,
  itens: 1,
  itensLivres: 1,
  aceitaVoluntarios: 1,
  horariosVoluntariado: 1,
  "endereco.bairro": 1,
  "endereco.municipio": 1,
  localizacaoPublica: 1,
  mostrarSoBairro: 1,
  urgencias: 1,
};

const idDe = (ong: OngCrua) => (typeof ong._id === "string" ? ong._id : ong._id.$oid);
const dataDe = (d: DataCrua) => (typeof d === "string" ? d : d.$date);

/** Nomes dos itens com urgência que ainda vale. */
const urgentesDe = (ong: OngCrua, agora = new Date()) =>
  (ong.urgencias ?? []).filter((u) => urgenciaAtiva({ ate: dataDe(u.ate) }, agora)).map((u) => u.nome);

/** Posição que pode ser mostrada: a real, ou a sorteada perto dela para quem mostra só o bairro. */
function posicaoPublica(ong: OngCrua): Ponto & { aproximada: boolean } {
  const [longitude, latitude] = ong.localizacaoPublica!.coordinates;
  return { latitude, longitude, aproximada: !!ong.mostrarSoBairro };
}

const DIA_CURTO: Record<string, string> = {
  ...Object.fromEntries(DIAS_VOLUNTARIADO.map((d) => [d.valor, d.nome])),
  DOMINGO: "Dom",
  SEGUNDA: "Seg",
  TERCA: "Ter",
  QUARTA: "Qua",
  QUINTA: "Qui",
  SEXTA: "Sex",
  SABADO: "Sáb",
};

function horarioBate(h: HorarioCru, f: FiltrosData): boolean {
  if (f.dias.length && !f.dias.some((d) => DIAS_QUE_VALEM[d].includes(h.dia))) return false;
  if (f.turnos.length && !f.turnos.some((t) => h.turnos.includes(t))) return false;
  if (f.atividades.length && !f.atividades.includes(h.atividade)) return false;
  return true;
}

export type OngNaLista = {
  id: string;
  /** endereço da página pública: /ong/<endereco> (slug, ou o ID) */
  endereco: string;
  nome: string;
  logoUrl: string | null;
  causa: string | null; // a primeira causa escolhida
  local: string | null; // bairro (ou cidade)
  latitude: number;
  longitude: number;
  aproximada: boolean;
  distanciaKm: number;
  itens: string[]; // nomes, lista fixa primeiro
  itensQueBatem: string[]; // os que batem com o filtro de itens
  horarios: string[]; // "Sáb · 8h – 12h · Recreação" (só quando aceita voluntários)
  horariosQueBatem: string[];
  /** itens com urgência ativa (selo "URGENTE") */
  urgentes: string[];
};

function paraLista(ong: OngCrua, f: FiltrosData, nomes: Nomes, referencia: Ponto): OngNaLista {
  const posicao = posicaoPublica(ong);
  const itensFixos = (ong.itens ?? []).map((slug) => ({ slug, nome: nomes.ITEM.get(slug) ?? slug }));
  const livres = ong.itensLivres ?? [];

  const horarios = ong.aceitaVoluntarios ? (ong.horariosVoluntariado ?? []) : [];
  const textoHorario = (h: HorarioCru) =>
    [
      DIA_CURTO[h.dia] ?? h.dia,
      formatarHorario(h.inicio, h.fim),
      h.atividade === ATIVIDADE_OUTRA ? h.atividadeOutra : (nomes.ATIVIDADE.get(h.atividade) ?? h.atividade),
    ]
      .filter(Boolean)
      .join(" · ");
  const temFiltroDeHorario = f.dias.length + f.turnos.length + f.atividades.length > 0;

  return {
    id: idDe(ong),
    endereco: ong.slug ?? idDe(ong),
    nome: ong.nomePublico ?? "",
    logoUrl: ong.logo ? urlPublica(ong.logo) : null,
    causa: ong.causas?.[0] ? (nomes.CAUSA.get(ong.causas[0]) ?? null) : null,
    local: ong.endereco?.bairro || ong.endereco?.municipio || null,
    latitude: posicao.latitude,
    longitude: posicao.longitude,
    aproximada: posicao.aproximada,
    distanciaKm: Math.round(distanciaKm(referencia, posicao) * 100) / 100,
    itens: [...itensFixos.map((i) => i.nome), ...livres.map((i) => i.nome)],
    itensQueBatem: [
      ...itensFixos.filter((i) => f.itens.includes(i.slug)).map((i) => i.nome),
      ...livres.filter((i) => f.livres.includes(i.chave)).map((i) => i.nome),
    ],
    horarios: horarios.map(textoHorario),
    horariosQueBatem: temFiltroDeHorario ? horarios.filter((h) => horarioBate(h, f)).map(textoHorario) : [],
    urgentes: urgentesDe(ong),
  };
}

// ---- consultas ----

/**
 * Lista (P1/P3): ONGs publicadas que batem com os filtros, das mais próximas para as mais
 * distantes do ponto de referência, até RAIO_LISTA_KM. `total` conta todas dentro do raio.
 */
export async function listarOngsProximas(referencia: Ponto, filtros: FiltrosData, limite: number) {
  const ongs: Condicao[] = [{ $limit: Math.max(limite, 1) }, { $project: PROJECAO }];
  const [resultado] = (await prisma.ong.aggregateRaw({
    pipeline: [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [referencia.longitude, referencia.latitude] },
          distanceField: "distancia",
          key: "localizacaoPublica",
          maxDistance: RAIO_LISTA_KM * 1000,
          query: montarFiltro(filtros),
          spherical: true,
        },
      },
      { $facet: { total: [{ $count: "n" }], ...(limite > 0 ? { ongs } : {}) } },
    ],
  })) as unknown as { total: { n: number }[]; ongs?: OngCrua[] }[];

  const nomes = limite > 0 ? await nomesDasListas() : null;
  return {
    total: resultado?.total[0]?.n ?? 0,
    ongs: (resultado?.ongs ?? []).map((ong) => paraLista(ong, filtros, nomes!, referencia)),
  };
}

export type PinNoMapa = { id: string; nome: string; latitude: number; longitude: number; urgente: boolean };

const PONTOS_POR_LADO = 16;

/**
 * Retângulo da tela como polígono GeoJSON. No MongoDB os lados de um polígono são arcos de
 * círculo máximo, que em zoom de estado "entortam" vários km em relação à linha reta da tela;
 * pontos intermediários nos lados mantêm o polígono colado ao retângulo.
 */
export function poligonoDoBbox([oeste, sul, leste, norte]: Bbox) {
  const lado = (de: [number, number], para: [number, number]) =>
    Array.from({ length: PONTOS_POR_LADO }, (_, i): [number, number] => [
      de[0] + ((para[0] - de[0]) * i) / PONTOS_POR_LADO,
      de[1] + ((para[1] - de[1]) * i) / PONTOS_POR_LADO,
    ]);
  const anel = [
    ...lado([oeste, sul], [leste, sul]),
    ...lado([leste, sul], [leste, norte]),
    ...lado([leste, norte], [oeste, norte]),
    ...lado([oeste, norte], [oeste, sul]),
  ];
  return { type: "Polygon", coordinates: [[...anel, anel[0]]] };
}

/** Pins (P1): ONGs publicadas que batem com os filtros dentro da área visível do mapa. */
export async function pinsNoMapa(bbox: Bbox, filtros: FiltrosData): Promise<PinNoMapa[]> {
  const ongs = (await prisma.ong.findRaw({
    filter: { ...montarFiltro(filtros), localizacaoPublica: { $geoWithin: { $geometry: poligonoDoBbox(bbox) } } },
    options: { projection: { nomePublico: 1, localizacaoPublica: 1, mostrarSoBairro: 1, "urgencias.ate": 1 }, limit: MAX_PINS },
  })) as unknown as OngCrua[];

  return ongs.map((ong) => {
    const { latitude, longitude } = posicaoPublica(ong);
    const urgente = (ong.urgencias ?? []).some((u) => urgenciaAtiva({ ate: dataDe(u.ate) }));
    return { id: idDe(ong), nome: ong.nomePublico ?? "", latitude, longitude, urgente };
  });
}

export type OngEncontrada = { id: string; nome: string; local: string | null; latitude: number; longitude: number };

/** Busca por nome (campo "ONG ou bairro"), em qualquer lugar do país. */
export async function buscarOngsPorNome(texto: string): Promise<OngEncontrada[]> {
  const padrao = texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ongs = (await prisma.ong.findRaw({
    filter: { status: "PUBLICADA", nomePublico: { $regex: padrao, $options: "i" } },
    options: { projection: PROJECAO, limit: 6 },
  })) as unknown as OngCrua[];

  return ongs
    .filter((ong) => ong.localizacaoPublica)
    .map((ong) => {
      const { latitude, longitude } = posicaoPublica(ong);
      return {
        id: idDe(ong),
        nome: ong.nomePublico ?? "",
        local: ong.endereco?.bairro || ong.endereco?.municipio || null,
        latitude,
        longitude,
      };
    });
}

export type ItemLivrePopular = { chave: string; nome: string; ongs: number };

/** Itens fora da lista mais usados pelas ONGs publicadas ("Cadastrados pelas ONGs", no P2). */
export async function itensLivresPopulares(limite = 12): Promise<ItemLivrePopular[]> {
  const resultado = await prisma.ong.aggregateRaw({
    pipeline: [
      { $match: { status: "PUBLICADA" } },
      { $unwind: "$itensLivres" },
      { $group: { _id: "$itensLivres.chave", nome: { $first: "$itensLivres.nome" }, ongs: { $sum: 1 } } },
      { $sort: { ongs: -1, _id: 1 } },
      { $limit: limite },
      { $project: { _id: 0, chave: "$_id", nome: 1, ongs: 1 } },
    ],
  });
  return resultado as unknown as ItemLivrePopular[];
}
