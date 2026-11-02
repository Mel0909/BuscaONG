import prisma from "@/backend/services/db";
import { buscarOpcoes } from "@/backend/services/listas";
import { Prisma, type Ong } from "@/generated/prisma";
import type {
  ApresentacaoData,
  CausasItensData,
  ContatosData,
  EnvioImagemData,
  LocalizacaoData,
  VoluntariadoData,
} from "@/backend/schemas";
import { urlDeEnvio } from "@/lib/armazenamento";
import { ATIVIDADE_OUTRA, calcularTurnos } from "@/lib/cadastro/voluntariado";
import { distanciaKm, posicaoAproximada } from "@/lib/mapa/geo";
import { slugLivre } from "@/lib/ong/slug";
import { itemLivre } from "@/lib/ong/urgencia";
import { normalizarChave } from "@/utils/formatters/texto";
import {
  CadastroAlteradoError,
  CadastroIncompletoError,
  ImagemInvalidaError,
  OngNaoEncontradaError,
  OngSuspensaError,
  OpcaoInvalidaError,
} from "./erros";

// Passos 3 a 8 do cadastro. Cada passo salva o que a ONG preencheu e avança o `passoAtual`,
// que diz até onde ela pode ir. Tudo age sobre a ONG do usuário logado (nunca por ID vindo de fora).

const ULTIMO_PASSO = 8;

export async function buscarOngDoUsuario(userId: string) {
  return prisma.ong.findUnique({ where: { userId } });
}

async function ongDoUsuario(userId: string) {
  const ong = await buscarOngDoUsuario(userId);
  if (!ong) throw new OngNaoEncontradaError();
  return ong;
}

/** Depois de salvar o passo `passo`, o próximo fica liberado (sem voltar atrás). */
function proximoPasso(ong: Pick<Ong, "passoAtual">, passo: number) {
  return Math.max(ong.passoAtual, Math.min(passo + 1, ULTIMO_PASSO));
}

const resumo = { id: true, status: true, passoAtual: true } as const;

/** Até essa distância, mover o pin é ajuste do mesmo endereço: o desvio sorteado continua o mesmo. */
const MESMO_LUGAR_KM = 1;

/**
 * Posição que a área pública vê: a real, ou um ponto sorteado perto dela para quem mostra só o
 * bairro. Ajustar o pin mantém o desvio sorteado antes (só desloca junto): sortear de novo a cada
 * ajuste daria várias amostras em volta do endereço, e a média delas o revelaria. Sorteia de novo
 * só quando a ONG liga "só o bairro" ou muda para longe.
 */
export function posicaoPublica(
  ong: Pick<Ong, "localizacao" | "localizacaoPublica" | "mostrarSoBairro">,
  real: { latitude: number; longitude: number },
  mostrarSoBairro: boolean
) {
  if (!mostrarSoBairro) return { type: "Point", coordinates: [real.longitude, real.latitude] };
  const antes = ong.localizacao?.coordinates;
  const publica = ong.localizacaoPublica?.coordinates;
  if (ong.mostrarSoBairro && antes && publica && distanciaKm({ longitude: antes[0], latitude: antes[1] }, real) < MESMO_LUGAR_KM) {
    return { type: "Point", coordinates: [real.longitude + (publica[0] - antes[0]), real.latitude + (publica[1] - antes[1])] };
  }
  const aproximada = posicaoAproximada(real);
  return { type: "Point", coordinates: [aproximada.longitude, aproximada.latitude] };
}

/**
 * Grava só se a ONG continua como foi lida (mesma situação e mesmo updatedAt): uma gravação
 * baseada em dados anteriores a um reinício, à publicação ou a outra edição é recusada.
 * Vale para o cadastro e para o painel, onde a ONG publicada edita o perfil pelos mesmos passos.
 */
async function atualizarCadastro(ong: Ong, data: Prisma.OngUpdateInput) {
  try {
    return await prisma.ong.update({
      where: { id: ong.id, userId: ong.userId, status: ong.status, updatedAt: ong.updatedAt },
      data: { ...data, updatedAt: new Date(Math.max(Date.now(), ong.updatedAt.getTime() + 1)) },
      select: resumo,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new CadastroAlteradoError();
    }
    throw error;
  }
}

/** Passo 3. */
export async function salvarLocalizacao(userId: string, dados: LocalizacaoData) {
  const ong = await ongDoUsuario(userId);
  return atualizarCadastro(ong, {
    endereco: dados.endereco,
    localizacao: { type: "Point", coordinates: [dados.longitude, dados.latitude] },
    localizacaoPublica: posicaoPublica(ong, dados, dados.mostrarSoBairro),
    mostrarSoBairro: dados.mostrarSoBairro,
    passoAtual: proximoPasso(ong, 3),
  });
}

/** Passo 4. */
export async function salvarContatos(userId: string, dados: ContatosData) {
  const ong = await ongDoUsuario(userId);
  return atualizarCadastro(ong, { contatos: dados, passoAtual: proximoPasso(ong, 4) });
}

/** Passo 5. Item livre com o mesmo nome de um item da lista vira o item da lista. */
export async function salvarCausasItens(userId: string, dados: CausasItensData) {
  const ong = await ongDoUsuario(userId);

  const causas = [...new Set(dados.causas)];
  if ((await buscarOpcoes("CAUSA", causas)).length !== causas.length) {
    throw new OpcaoInvalidaError("causas");
  }

  const itens = new Set(dados.itens);
  if ((await buscarOpcoes("ITEM", [...itens])).length !== itens.size) {
    throw new OpcaoInvalidaError("itens");
  }

  const listaDeItens = await prisma.opcaoLista.findMany({
    where: { tipo: "ITEM" },
    select: { slug: true, nome: true },
  });
  const itemPorChave = new Map(listaDeItens.map((i) => [normalizarChave(i.nome), i.slug]));

  const itensLivres = new Map<string, { nome: string; chave: string }>();
  for (const nome of dados.itensLivres) {
    const chave = normalizarChave(nome);
    const daLista = itemPorChave.get(chave);
    if (daLista) itens.add(daLista);
    else if (!itensLivres.has(chave)) itensLivres.set(chave, { nome: nome.replace(/\s+/g, " "), chave });
  }

  // item que saiu da lista leva junto a urgência dele
  const itensDaOng = new Set([...itens, ...[...itensLivres.keys()].map(itemLivre)]);
  const urgencias = (ong.urgencias ?? []).filter((u) => itensDaOng.has(u.item));

  return atualizarCadastro(ong, {
    causas,
    itens: [...itens],
    itensLivres: [...itensLivres.values()],
    urgencias,
    passoAtual: proximoPasso(ong, 5),
  });
}

export type SugestaoItem = { nome: string; chave: string; ongs: number };

/**
 * Itens livres já usados por outras ONGs que começam com o texto digitado
 * ("Ventil" → "Ventilador", usado por 4 ONGs). Usar o mesmo nome ajuda quem filtra.
 */
export async function sugerirItensLivres(userId: string, texto: string): Promise<SugestaoItem[]> {
  const prefixo = normalizarChave(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!prefixo) return [];

  const resultado = await prisma.ong.aggregateRaw({
    pipeline: [
      { $match: { userId: { $ne: userId }, "itensLivres.chave": { $regex: `^${prefixo}` } } },
      { $unwind: "$itensLivres" },
      { $match: { "itensLivres.chave": { $regex: `^${prefixo}` } } },
      { $group: { _id: "$itensLivres.chave", nome: { $first: "$itensLivres.nome" }, ongs: { $sum: 1 } } },
      { $sort: { ongs: -1, _id: 1 } },
      { $limit: 5 },
      { $project: { _id: 0, chave: "$_id", nome: 1, ongs: 1 } },
    ],
  });

  return resultado as unknown as SugestaoItem[];
}

/** Passo 6. */
export async function salvarVoluntariado(userId: string, dados: VoluntariadoData) {
  const ong = await ongDoUsuario(userId);

  const atividades = [...new Set(dados.horarios.map((h) => h.atividade).filter((a) => a !== ATIVIDADE_OUTRA))];
  if ((await buscarOpcoes("ATIVIDADE", atividades)).length !== atividades.length) {
    throw new OpcaoInvalidaError("horarios");
  }

  // desligado, os horários ficam guardados (somem do perfil e dos filtros, mas não se perdem)
  const horariosVoluntariado = dados.horarios.map((h) => ({
    dia: h.dia,
    inicio: h.inicio,
    fim: h.fim,
    atividade: h.atividade,
    atividadeOutra: h.atividade === ATIVIDADE_OUTRA ? h.atividadeOutra : null,
    turnos: calcularTurnos(h.inicio, h.fim),
  }));

  return atualizarCadastro(ong, {
    aceitaVoluntarios: dados.aceitaVoluntarios,
    horariosVoluntariado,
    requisitosVoluntariado: dados.requisitos,
    passoAtual: proximoPasso(ong, 6),
  });
}

/** Prefixo das chaves de imagem de uma ONG no R2: ongs/<id>/logo-<uuid>.jpg */
const prefixoImagem = (ongId: string, tipo: "logo" | "capa") => `ongs/${ongId}/${tipo}`;

/** URL assinada para o navegador enviar a logo ou a capa direto para o R2. */
export async function criarEnvioImagem(userId: string, { tipo, contentType, tamanho }: EnvioImagemData) {
  const ong = await ongDoUsuario(userId);
  return urlDeEnvio(prefixoImagem(ong.id, tipo), contentType, tamanho);
}

/** Passo 7. Só aceita chaves de imagem geradas para esta ONG. */
export async function salvarApresentacao(userId: string, dados: ApresentacaoData) {
  const ong = await ongDoUsuario(userId);

  for (const campo of ["logo", "capa"] as const) {
    const chave = dados[campo];
    if (chave && chave !== ong[campo] && !chave.startsWith(`${prefixoImagem(ong.id, campo)}-`)) {
      throw new ImagemInvalidaError(campo);
    }
  }

  return atualizarCadastro(ong, { ...dados, passoAtual: proximoPasso(ong, 7) });
}

/** O que ainda falta para publicar (vazio = pode publicar). Também alimenta a lista do passo 8. */
export function pendenciasParaPublicar(ong: Ong): string[] {
  const pendencias: string[] = [];
  if (!ong.localizacao) pendencias.push("localização no mapa");
  if (!ong.contatos?.whatsapp?.visivel && !ong.contatos?.email?.visivel) pendencias.push("um contato visível");
  if (ong.causas.length === 0) pendencias.push("pelo menos uma causa");
  if (ong.itens.length + ong.itensLivres.length === 0) pendencias.push("pelo menos um item");
  if (!ong.nomePublico || !ong.descricaoCurta) pendencias.push("nome público e descrição curta");
  return pendencias;
}

const slugOcupado = async (slug: string) => !!(await prisma.ong.findFirst({ where: { slug }, select: { id: true } }));

/** Passo 8: publica na hora, sem aprovação manual. Publicar de novo não muda nada. */
export async function publicarOng(userId: string) {
  const ong = await ongDoUsuario(userId);

  if (ong.status === "SUSPENSA") throw new OngSuspensaError();
  if (ong.status === "PUBLICADA") {
    return { id: ong.id, status: ong.status, passoAtual: ong.passoAtual, publicadaEm: ong.publicadaEm, slug: ong.slug };
  }

  const pendencias = pendenciasParaPublicar(ong);
  if (pendencias.length > 0) throw new CadastroIncompletoError(pendencias);

  const agora = new Date();
  // endereço da página pública; fica o mesmo se a ONG mudar de nome depois. O índice único do
  // slug (pnpm db:seed) recusa o mesmo slug para duas ONGs publicando ao mesmo tempo: aí tenta o próximo.
  for (let tentativa = 1; ; tentativa++) {
    const slug = ong.slug ?? (await slugLivre(ong.nomePublico!, slugOcupado));
    try {
      await atualizarCadastro(ong, { status: "PUBLICADA", publicadaEm: agora, termosAceitosEm: agora, passoAtual: ULTIMO_PASSO, slug });
      return { id: ong.id, status: "PUBLICADA" as const, passoAtual: ULTIMO_PASSO, publicadaEm: agora, slug };
    } catch (error) {
      const slugRepetido = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!slugRepetido || ong.slug || tentativa >= 3) throw error;
    }
  }
}
