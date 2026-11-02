import { NextRequest, NextResponse } from "next/server";
import type { ZodType } from "zod";

import {
  CadastroIncompletoError,
  ImagemInvalidaError,
  LimiteUrgenciasError,
  OngNaoEncontradaError,
  PrazoObrigatorioError,
  OngSuspensaError,
  OpcaoInvalidaError,
} from "@/backend/services/ongs";
import { ArmazenamentoIndisponivelError } from "@/lib/armazenamento";
import { exigirSessaoOng, returnInvalidDataErrors, validBody, zodErrorHandler } from "@/utils/api/server";
import { toErrorMessage } from "@/utils/api/toErrorMessage";

const erro = (message: string, status: number, details?: unknown) =>
  NextResponse.json(toErrorMessage(message, details), { status });

/** Erros dos services do cadastro → resposta HTTP. */
export function respostaDeErro(error: unknown) {
  if (error instanceof OngNaoEncontradaError) return erro(error.message, 404);
  if (error instanceof OpcaoInvalidaError) return erro(error.message, 400, [{ campo: error.campo, message: error.message }]);
  if (error instanceof ImagemInvalidaError) return erro(error.message, 400, [{ campo: error.campo, message: error.message }]);
  if (error instanceof CadastroIncompletoError) return erro(error.message, 422, { pendencias: error.pendencias });
  if (error instanceof OngSuspensaError) return erro(error.message, 403);
  if (error instanceof LimiteUrgenciasError) return erro(error.message, 422);
  if (error instanceof PrazoObrigatorioError) return erro(error.message, 400, [{ campo: "dias", message: error.message }]);
  if (error instanceof ArmazenamentoIndisponivelError) return erro(error.message, 503);
  return zodErrorHandler(error);
}

/**
 * Rota de um passo do cadastro sobre a ONG do usuário logado:
 * sessão de ONG → corpo validado pelo schema → service.
 */
export function rotaDoCadastro<T>(
  schema: ZodType<T>,
  service: (userId: string, dados: T) => Promise<unknown>,
  status = 200
) {
  return async function (request: NextRequest) {
    try {
      const sessao = await exigirSessaoOng(request);
      if (sessao instanceof NextResponse) return sessao;

      const body = await validBody(request);
      if (body instanceof NextResponse) return body;

      const resultado = schema.safeParse(body);
      if (!resultado.success) return returnInvalidDataErrors(resultado.error);

      return NextResponse.json(await service(sessao.userId, resultado.data), { status });
    } catch (error) {
      return respostaDeErro(error);
    }
  };
}
