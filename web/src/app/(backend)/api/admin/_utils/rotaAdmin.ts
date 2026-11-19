import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";

import { objectIdSchema } from "@/backend/schemas";
import { AcaoInvalidaError, NaoEncontradoError, OpcaoDuplicadaError, OpcaoEmUsoError } from "@/backend/services/admin";
import { CnpjLookupUnavailableError, CnpjNotFoundError } from "@/lib/cnpj";
import { erroDeValidacao, erroJson, erroNaRota, exigirSessaoAdmin, lerJson, type SessaoAdmin } from "@/utils/api/server";

const erro = (message: string, status: number) => erroJson(status, message);

/** Erros dos services do admin → resposta HTTP. */
export function respostaAdmin(error: unknown) {
  if (error instanceof NaoEncontradoError) return erro(error.message, 404);
  if (error instanceof AcaoInvalidaError || error instanceof OpcaoDuplicadaError || error instanceof OpcaoEmUsoError) {
    return erro(error.message, 409);
  }
  if (error instanceof CnpjNotFoundError) return erro("CNPJ não encontrado na Receita Federal", 404);
  if (error instanceof CnpjLookupUnavailableError) return erro(error.message, 503);
  return erroNaRota(error);
}

type Contexto = { params: Promise<Record<string, string>> };

/**
 * Rota do admin: sessão de admin → ID da URL (se houver) → corpo validado pelo schema → service.
 * Corpo vazio vale como {} (ex.: POST de revalidação).
 */
export function rotaAdmin<T>(
  schema: ZodType<T>,
  acao: (admin: SessaoAdmin, dados: T, params: Record<string, string>) => Promise<unknown>,
  status = 200
) {
  return async function (request: NextRequest, { params }: Contexto) {
    try {
      const admin = await exigirSessaoAdmin(request);
      if (admin instanceof NextResponse) return admin;

      const segmentos = (await params) ?? {};
      if (segmentos.id !== undefined) {
        const id = objectIdSchema.safeParse(segmentos.id);
        if (!id.success) return erroDeValidacao(id.error);
      }

      const resultado = schema.safeParse(await lerJson(request, { vazio: {} }));
      if (!resultado.success) return erroDeValidacao(resultado.error);

      return NextResponse.json(await acao(admin, resultado.data, segmentos), { status });
    } catch (error) {
      return respostaAdmin(error);
    }
  };
}
