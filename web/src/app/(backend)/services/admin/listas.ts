import prisma from "@/backend/services/db";
import { limparCacheNomes } from "@/backend/services/ongs";
import type { DecisaoItemLivreData, EdicaoOpcaoData, NovaOpcaoData } from "@/backend/schemas";
import type { Ong, Prisma, TipoLista } from "@/generated/prisma";
import { slugDoNome } from "@/lib/ong/slug";
import { itemLivre } from "@/lib/ong/urgencia";
import { normalizarChave } from "@/utils/formatters/texto";
import { AcaoInvalidaError, NaoEncontradoError } from "./erros";
import { registrarAcao, type Autor } from "./registro";

// Listas fixas (A4): causas, itens e atividades usados nos filtros e no cadastro.
// A ONG guarda o slug, que nunca muda: renomear não mexe nas ONGs. Item em uso não se exclui,
// só se unifica com outro. Itens escritos à mão pelas ONGs viram sugestões para a lista.

type Admin = NonNullable<Autor>;

export class OpcaoDuplicadaError extends Error {
  constructor() {
    super("Já existe uma opção com esse nome nesta lista.");
    this.name = "OpcaoDuplicadaError";
  }
}

export class OpcaoEmUsoError extends Error {
  constructor(public readonly ongs: number) {
    super(`${ongs} ${ongs === 1 ? "ONG usa" : "ONGs usam"} esta opção. Unifique com outra em vez de excluir.`);
    this.name = "OpcaoEmUsoError";
  }
}

// onde cada lista fica na Ong: o array desenrolado e o slug dentro dele
const CAMPO_DA_LISTA: Record<TipoLista, { array: string; slug: string }> = {
  CAUSA: { array: "$causas", slug: "$causas" },
  ITEM: { array: "$itens", slug: "$itens" },
  ATIVIDADE: { array: "$horariosVoluntariado", slug: "$horariosVoluntariado.atividade" },
};

/** Quantas ONGs (de qualquer status) usam cada slug de uma lista. */
async function usoPorSlug(tipo: TipoLista): Promise<Map<string, number>> {
  const { array, slug } = CAMPO_DA_LISTA[tipo];
  const resultado = (await prisma.ong.aggregateRaw({
    pipeline: [
      { $unwind: array },
      // uma ONG com dois horários da mesma atividade conta uma vez
      { $group: { _id: { slug, ong: "$_id" } } },
      { $group: { _id: "$_id.slug", ongs: { $sum: 1 } } },
    ],
  })) as unknown as { _id: string; ongs: number }[];
  return new Map(resultado.map((r) => [r._id, r.ongs]));
}

export type OpcaoAdmin = { id: string; slug: string; nome: string; grupo: string | null; ativa: boolean; ongs: number };

/** Opções de uma lista (ativas e inativas), na ordem dos filtros, com quantas ONGs usam. */
export async function opcoesComUso(tipo: TipoLista): Promise<OpcaoAdmin[]> {
  const [opcoes, uso] = await Promise.all([
    prisma.opcaoLista.findMany({ where: { tipo }, orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
    usoPorSlug(tipo),
  ]);
  return opcoes.map((o) => ({ id: o.id, slug: o.slug, nome: o.nome, grupo: o.grupo, ativa: o.ativa, ongs: uso.get(o.slug) ?? 0 }));
}

export async function contarListas(): Promise<Record<TipoLista, number>> {
  const [CAUSA, ITEM, ATIVIDADE] = await Promise.all(
    (["CAUSA", "ITEM", "ATIVIDADE"] as const).map((tipo) => prisma.opcaoLista.count({ where: { tipo } }))
  );
  return { CAUSA, ITEM, ATIVIDADE };
}

async function slugLivreNaLista(tipo: TipoLista, nome: string) {
  const base = slugDoNome(nome);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await prisma.opcaoLista.findUnique({ where: { tipo_slug: { tipo, slug } }, select: { id: true } }))) return slug;
  }
}

async function garantirNomeUnico(tipo: TipoLista, nome: string, exceto?: string) {
  const chave = normalizarChave(nome);
  const opcoes = await prisma.opcaoLista.findMany({ where: { tipo }, select: { id: true, nome: true } });
  if (opcoes.some((o) => o.id !== exceto && normalizarChave(o.nome) === chave)) throw new OpcaoDuplicadaError();
}

async function criar(tipo: TipoLista, nome: string, grupo: string | null) {
  await garantirNomeUnico(tipo, nome);
  const ultima = await prisma.opcaoLista.findFirst({ where: { tipo }, orderBy: { ordem: "desc" }, select: { ordem: true } });
  const opcao = await prisma.opcaoLista.create({
    data: { tipo, nome, grupo, slug: await slugLivreNaLista(tipo, nome), ordem: (ultima?.ordem ?? -1) + 1 },
  });
  limparCacheNomes();
  return opcao;
}

export async function criarOpcao(autor: Admin, { tipo, nome, grupo }: NovaOpcaoData) {
  const opcao = await criar(tipo, nome, grupo);
  await registrarAcao(autor, "ADICIONOU_OPCAO", `“${nome}”`, { alvoId: opcao.id, motivo: `Lista de ${NOME_DA_LISTA[tipo]}` });
  return opcao;
}

export const NOME_DA_LISTA: Record<TipoLista, string> = { CAUSA: "causas", ITEM: "itens", ATIVIDADE: "atividades" };

async function opcaoPorId(id: string) {
  const opcao = await prisma.opcaoLista.findUnique({ where: { id } });
  if (!opcao) throw new NaoEncontradoError("Opção não encontrada");
  return opcao;
}

export async function editarOpcao(autor: Admin, id: string, dados: EdicaoOpcaoData) {
  const opcao = await opcaoPorId(id);
  if (dados.nome !== undefined) await garantirNomeUnico(opcao.tipo, dados.nome, id);

  const atualizada = await prisma.opcaoLista.update({ where: { id }, data: dados });
  limparCacheNomes();

  const mudancas = [
    dados.nome !== undefined && dados.nome !== opcao.nome ? `nome: “${opcao.nome}” → “${dados.nome}”` : null,
    dados.grupo !== undefined && dados.grupo !== opcao.grupo ? `grupo: ${dados.grupo ?? "nenhum"}` : null,
    dados.ativa !== undefined && dados.ativa !== opcao.ativa ? (dados.ativa ? "reativada" : "desativada") : null,
  ].filter(Boolean);
  if (mudancas.length) await registrarAcao(autor, "EDITOU_OPCAO", `“${atualizada.nome}”`, { alvoId: id, motivo: mudancas.join(" · ") });
  return atualizada;
}

/** Nova ordem: `ids` precisa ter exatamente as opções da lista. */
export async function reordenarLista(autor: Admin, tipo: TipoLista, ids: string[]) {
  const atuais = await prisma.opcaoLista.findMany({ where: { tipo }, select: { id: true } });
  const conjunto = new Set(ids);
  if (conjunto.size !== ids.length || atuais.length !== ids.length || atuais.some((o) => !conjunto.has(o.id))) {
    throw new AcaoInvalidaError("A lista mudou enquanto você reordenava. Recarregue a página.");
  }
  await Promise.all(ids.map((id, ordem) => prisma.opcaoLista.update({ where: { id }, data: { ordem } })));
  limparCacheNomes();
  await registrarAcao(autor, "REORDENOU_LISTA", `Lista de ${NOME_DA_LISTA[tipo]}`);
  return { ids };
}

/** Troca um slug por outro em todas as ONGs que o usam (sem repetir). */
async function trocarNasOngs(tipo: TipoLista, de: string, para: string, nomePara: string) {
  const onde: Prisma.OngWhereInput =
    tipo === "CAUSA"
      ? { causas: { has: de } }
      : tipo === "ITEM"
        ? { itens: { has: de } }
        : { horariosVoluntariado: { some: { atividade: de } } };
  const ongs = await prisma.ong.findMany({ where: onde });

  for (const ong of ongs) {
    const troca = (lista: string[]) => [...new Set(lista.map((s) => (s === de ? para : s)))];
    const dados: Partial<Pick<Ong, "causas" | "itens" | "horariosVoluntariado" | "urgencias">> = {};
    if (tipo === "CAUSA") dados.causas = troca(ong.causas);
    if (tipo === "ITEM") {
      dados.itens = troca(ong.itens);
      dados.urgencias = urgenciasTrocadas(ong, de, para, nomePara);
    }
    if (tipo === "ATIVIDADE") dados.horariosVoluntariado = ong.horariosVoluntariado.map((h) => (h.atividade === de ? { ...h, atividade: para } : h));
    await prisma.ong.update({ where: { id: ong.id }, data: dados });
  }
  return ongs.length;
}

/** A urgência de um item que mudou de chave passa para a chave nova (sem duplicar). */
function urgenciasTrocadas(ong: Pick<Ong, "urgencias">, de: string, para: string, nomePara: string) {
  const jaTem = ong.urgencias.some((u) => u.item === para);
  return ong.urgencias
    .filter((u) => !(u.item === de && jaTem))
    .map((u) => (u.item === de ? { ...u, item: para, nome: nomePara } : u));
}

/** Passa as ONGs desta opção para outra da mesma lista e apaga esta. */
export async function unificarOpcoes(autor: Admin, origemId: string, destinoId: string) {
  if (origemId === destinoId) throw new AcaoInvalidaError("Escolha outra opção para unificar.");
  const [origem, destino] = await Promise.all([opcaoPorId(origemId), opcaoPorId(destinoId)]);
  if (origem.tipo !== destino.tipo) throw new AcaoInvalidaError("Só dá para unificar opções da mesma lista.");

  const ongs = await trocarNasOngs(origem.tipo, origem.slug, destino.slug, destino.nome);
  await prisma.opcaoLista.delete({ where: { id: origemId } });
  limparCacheNomes();
  await registrarAcao(autor, "UNIFICOU_OPCOES", `“${origem.nome}” → “${destino.nome}”`, {
    alvoId: destinoId,
    motivo: `${ongs} ${ongs === 1 ? "ONG passou" : "ONGs passaram"} para “${destino.nome}”`,
  });
  return { ongs };
}

export async function excluirOpcao(autor: Admin, id: string) {
  const opcao = await opcaoPorId(id);
  const ongs = (await usoPorSlug(opcao.tipo)).get(opcao.slug) ?? 0;
  if (ongs > 0) throw new OpcaoEmUsoError(ongs);

  await prisma.opcaoLista.delete({ where: { id } });
  limparCacheNomes();
  await registrarAcao(autor, "EXCLUIU_OPCAO", `“${opcao.nome}”`, { motivo: `Lista de ${NOME_DA_LISTA[opcao.tipo]}` });
  return { id };
}

// ---- sugestões do texto livre ----

export type SugestaoItemLivre = {
  chave: string;
  nome: string;
  ongs: number;
  /** item da lista parecido, para oferecer "Unificar com" */
  parecido: { id: string; nome: string } | null;
};

/** Raiz simples de uma palavra para comparar ("fraldas" e "fralda" → "fralda"). */
const raiz = (palavra: string) => palavra.replace(/(oes|aes|ais|eis|s)$/, "");

/** Item da lista parecido com o texto livre: um contém o outro, ou começam pela mesma palavra. */
export function itemParecido<T extends { nome: string }>(chave: string, itens: T[]): T | null {
  const palavras = chave.split(" ").map(raiz);
  for (const item of itens) {
    const nome = normalizarChave(item.nome);
    if (chave.includes(nome) || nome.includes(chave)) return item;
    if (raiz(nome.split(" ")[0]) === palavras[0] && palavras[0].length >= 4) return item;
  }
  return null;
}

/** Itens livres usados pelas ONGs, dos mais usados para os menos, menos os que o admin manteve. */
export async function sugestoesItensLivres(limite = 30): Promise<SugestaoItemLivre[]> {
  const [agrupados, mantidos, itens] = await Promise.all([
    prisma.ong.aggregateRaw({
      pipeline: [
        { $match: { status: { $ne: "SUSPENSA" } } },
        { $unwind: "$itensLivres" },
        { $group: { _id: "$itensLivres.chave", nome: { $first: "$itensLivres.nome" }, ongs: { $sum: 1 } } },
        { $sort: { ongs: -1, _id: 1 } },
        { $limit: limite + 200 },
      ],
    }) as unknown as Promise<{ _id: string; nome: string; ongs: number }[]>,
    prisma.itemLivreMantido.findMany({ select: { chave: true } }),
    prisma.opcaoLista.findMany({ where: { tipo: "ITEM" }, select: { id: true, nome: true }, orderBy: { ordem: "asc" } }),
  ]);
  const ignorar = new Set(mantidos.map((m) => m.chave));

  return agrupados
    .filter((g) => !ignorar.has(g._id))
    .slice(0, limite)
    .map((g) => ({ chave: g._id, nome: g.nome, ongs: g.ongs, parecido: itemParecido(g._id, itens) }));
}

/** O texto livre vira o item `slug` da lista em todas as ONGs que o escreveram. */
async function converterItemLivre(chave: string, slug: string, nome: string) {
  const ongs = await prisma.ong.findMany({ where: { itensLivres: { some: { chave } } } });
  for (const ong of ongs) {
    await prisma.ong.update({
      where: { id: ong.id },
      data: {
        itensLivres: ong.itensLivres.filter((i) => i.chave !== chave),
        itens: ong.itens.includes(slug) ? ong.itens : [...ong.itens, slug],
        urgencias: urgenciasTrocadas(ong, itemLivre(chave), slug, nome),
      },
    });
  }
  return ongs.length;
}

export async function decidirItemLivre(autor: Admin, decisao: DecisaoItemLivreData) {
  const { chave } = decisao;
  const exemplo = await prisma.ong.findFirst({ where: { itensLivres: { some: { chave } } }, select: { itensLivres: true } });
  const nomeLivre = exemplo?.itensLivres.find((i) => i.chave === chave)?.nome ?? chave;

  if (decisao.acao === "MANTER") {
    await prisma.itemLivreMantido.upsert({ where: { chave }, update: {}, create: { chave } });
    await registrarAcao(autor, "MANTEVE_ITEM_LIVRE", `“${nomeLivre}”`);
    return { ongs: 0 };
  }

  if (!exemplo) throw new NaoEncontradoError("Nenhuma ONG usa mais esse item");

  const destino =
    decisao.acao === "ADICIONAR"
      ? await criar("ITEM", nomeLivre.charAt(0).toUpperCase() + nomeLivre.slice(1), decisao.grupo)
      : await opcaoPorId(decisao.destinoId);
  if (destino.tipo !== "ITEM") throw new AcaoInvalidaError("Escolha um item da lista de itens.");

  const ongs = await converterItemLivre(chave, destino.slug, destino.nome);
  const plural = `${ongs} ${ongs === 1 ? "ONG usava" : "ONGs usavam"} em texto livre`;
  if (decisao.acao === "ADICIONAR") {
    await registrarAcao(autor, "ADICIONOU_ITEM_LIVRE", `“${destino.nome}”`, { alvoId: destino.id, motivo: plural });
  } else {
    await registrarAcao(autor, "UNIFICOU_ITEM_LIVRE", `“${nomeLivre}” → “${destino.nome}”`, { alvoId: destino.id, motivo: plural });
  }
  return { ongs };
}
