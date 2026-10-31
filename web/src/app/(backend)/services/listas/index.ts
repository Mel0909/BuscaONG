import prisma from "@/backend/services/db";
import type { TipoLista } from "@/generated/prisma";

export type Opcao = { slug: string; nome: string };

/** Opções ativas de uma lista fixa, na ordem definida pelo admin. */
export async function listarOpcoes(tipo: TipoLista): Promise<Opcao[]> {
  return prisma.opcaoLista.findMany({
    where: { tipo, ativa: true },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { slug: true, nome: true },
  });
}

/**
 * Opções de uma lista com esses slugs (ativas ou não: uma opção desativada continua valendo
 * para quem já a usava). Serve para conferir o que veio do navegador.
 */
export async function buscarOpcoes(tipo: TipoLista, slugs: string[]): Promise<Opcao[]> {
  if (slugs.length === 0) return [];
  return prisma.opcaoLista.findMany({
    where: { tipo, slug: { in: slugs } },
    select: { slug: true, nome: true },
  });
}
