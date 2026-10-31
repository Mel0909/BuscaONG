import prisma from "@/backend/services/db";
import { lookupCnpj, type CnpjData } from "@/lib/cnpj";
import { verificarElegibilidade, type MotivoNaoElegivel } from "./elegibilidade";

export * from "./elegibilidade";

export async function findOngByCnpj(cnpj: string) {
  return prisma.ong.findUnique({ where: { cnpj } });
}

export type ConsultaCnpj =
  | { status: "JA_CADASTRADO"; cnpj: string }
  | { status: "NAO_ELEGIVEL"; cnpj: string; motivo: MotivoNaoElegivel; receita: CnpjData }
  | { status: "ELEGIVEL"; cnpj: string; receita: CnpjData };

/**
 * Passo 1 do cadastro: diz se o CNPJ (já normalizado e com dígito verificador válido)
 * pode criar uma conta. Erros de consulta (CnpjNotFoundError, CnpjLookupUnavailableError)
 * sobem para quem chamou.
 */
export async function consultarCnpjParaCadastro(cnpj: string): Promise<ConsultaCnpj> {
  if (await findOngByCnpj(cnpj)) {
    return { status: "JA_CADASTRADO", cnpj };
  }

  const receita = await lookupCnpj(cnpj);
  const elegibilidade = verificarElegibilidade(receita);

  if (!elegibilidade.elegivel) {
    return { status: "NAO_ELEGIVEL", cnpj, motivo: elegibilidade.motivo, receita };
  }

  return { status: "ELEGIVEL", cnpj, receita };
}
