import prisma from "@/backend/services/db";
import type { CategoriaAcao } from "@/backend/schemas";
import type { Prisma, TipoAcao } from "@prisma/client";

// Registro de ações (A3): toda ação do admin vira uma linha. Somente leitura: nada aqui
// edita ou apaga linhas. Ações automáticas (sem admin) aparecem como "sistema".

/** Quem fez a ação: o admin logado, ou null para o sistema. */
export type Autor = { id: string; email: string } | null;

export async function registrarAcao(
  autor: Autor,
  tipo: TipoAcao,
  alvo: string,
  { alvoId, motivo }: { alvoId?: string; motivo?: string | null } = {}
) {
  return prisma.acaoAdmin.create({
    data: { tipo, alvo, alvoId: alvoId ?? null, motivo: motivo ?? null, adminId: autor?.id ?? null, adminEmail: autor?.email ?? null },
  });
}

export const NOME_DA_ACAO: Record<TipoAcao, string> = {
  SUSPENDEU_ONG: "Suspendeu ONG",
  REATIVOU_ONG: "Reativou ONG",
  EXCLUIU_ONG: "Excluiu ONG",
  REVALIDOU_CNPJ: "Revalidou CNPJ",
  ARQUIVOU_DENUNCIA: "Arquivou denúncia",
  ADICIONOU_OPCAO: "Adicionou à lista",
  EDITOU_OPCAO: "Editou item da lista",
  REORDENOU_LISTA: "Reordenou lista",
  UNIFICOU_OPCOES: "Unificou itens",
  EXCLUIU_OPCAO: "Excluiu item da lista",
  ADICIONOU_ITEM_LIVRE: "Adicionou item à lista",
  UNIFICOU_ITEM_LIVRE: "Unificou texto livre",
  MANTEVE_ITEM_LIVRE: "Manteve texto livre",
  APROVOU_IMAGEM: "Aprovou imagem",
  REMOVEU_IMAGEM: "Removeu imagem",
};

const TIPOS_DA_CATEGORIA: Record<Exclude<CategoriaAcao, "todas" | "sistema">, TipoAcao[]> = {
  suspensoes: ["SUSPENDEU_ONG", "REATIVOU_ONG"],
  exclusoes: ["EXCLUIU_ONG"],
  denuncias: ["ARQUIVOU_DENUNCIA"],
  imagens: ["APROVOU_IMAGEM", "REMOVEU_IMAGEM"],
  listas: [
    "ADICIONOU_OPCAO",
    "EDITOU_OPCAO",
    "REORDENOU_LISTA",
    "UNIFICOU_OPCOES",
    "EXCLUIU_OPCAO",
    "ADICIONOU_ITEM_LIVRE",
    "UNIFICOU_ITEM_LIVRE",
    "MANTEVE_ITEM_LIVRE",
  ],
};

export async function listarAcoes(categoria: CategoriaAcao, busca: string, limite = 300) {
  const filtros: Prisma.AcaoAdminWhereInput[] = [];
  if (categoria === "sistema") filtros.push({ adminId: null });
  else if (categoria !== "todas") filtros.push({ tipo: { in: TIPOS_DA_CATEGORIA[categoria] } });
  if (busca) {
    filtros.push({
      OR: [
        { alvo: { contains: busca, mode: "insensitive" } },
        { adminEmail: { contains: busca, mode: "insensitive" } },
        { motivo: { contains: busca, mode: "insensitive" } },
      ],
    });
  }

  return prisma.acaoAdmin.findMany({
    where: filtros.length ? { AND: filtros } : {},
    orderBy: { createdAt: "desc" },
    take: limite,
  });
}

/**
 * Uma célula do CSV. O nome da ONG vem de quem cadastrou: começando com = + - @ (ou tab), o Excel o
 * leria como fórmula ao abrir o arquivo. O apóstrofo na frente faz virar texto.
 */
function celula(texto: string) {
  const valor = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return /[",\n;]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** "Exportar CSV": as linhas do filtro atual, com data no horário de Brasília. */
export async function acoesEmCsv(categoria: CategoriaAcao, busca: string): Promise<string> {
  const acoes = await listarAcoes(categoria, busca, 10_000);
  const linhas = acoes.map((a) =>
    [
      a.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      a.adminEmail ?? "sistema",
      NOME_DA_ACAO[a.tipo],
      a.alvo,
      a.motivo ?? "",
    ]
      .map(celula)
      .join(",")
  );
  return ["quando,quem,acao,alvo,motivo", ...linhas].join("\n");
}
