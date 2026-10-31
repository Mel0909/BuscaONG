import { NextRequest, NextResponse } from "next/server";
import { isAPIError } from "better-auth/api";

import { novaContaOngSchema } from "@/backend/schemas";
import {
  criarContaOng,
  EmailEmUsoError,
  OngJaCadastradaError,
  OngNaoElegivelError,
} from "@/backend/services/ongs";
import { CnpjLookupUnavailableError, CnpjNotFoundError } from "@/lib/cnpj";
import {
  clientIp,
  rateLimit,
  returnInvalidDataErrors,
  tooManyRequests,
  validBody,
  zodErrorHandler,
} from "@/utils/api/server";
import { toErrorMessage } from "@/utils/api/toErrorMessage";

// pública: cria a conta, consulta a Receita e envia e-mail, então o limite é mais baixo
const LIMITE = { limit: 5, windowMs: 60_000 };

const erro = (message: string, status: number, details?: unknown) =>
  NextResponse.json(toErrorMessage(message, details), { status });

// passo 2 do cadastro: cria a conta (e-mail ainda não verificado) e a ONG em rascunho
export async function POST(request: NextRequest) {
  try {
    const limite = rateLimit(`ongs:${clientIp(request)}`, LIMITE);
    if (!limite.ok) {
      return tooManyRequests(limite.retryAfterSeconds);
    }

    const body = await validBody(request);
    if (body instanceof NextResponse) {
      return body;
    }

    const validationResult = novaContaOngSchema.safeParse(body);
    if (!validationResult.success) {
      return returnInvalidDataErrors(validationResult.error);
    }

    const conta = await criarContaOng(validationResult.data);
    return NextResponse.json(conta, { status: 201 });
  } catch (error) {
    if (error instanceof OngJaCadastradaError) return erro(error.message, 409, { campo: "cnpj" });
    if (error instanceof EmailEmUsoError) return erro(error.message, 409, { campo: "email" });
    if (error instanceof OngNaoElegivelError) return erro(error.message, 422, { motivo: error.motivo });
    if (error instanceof CnpjNotFoundError) return erro("CNPJ não encontrado na Receita Federal", 404);
    if (error instanceof CnpjLookupUnavailableError) {
      return erro("Não foi possível consultar a Receita Federal agora. Tente de novo em instantes.", 503);
    }
    // erros do better-auth com mensagem para o usuário (ex.: regra de senha)
    if (isAPIError(error) && error.status === "BAD_REQUEST") {
      return erro(error.message, 400);
    }

    return zodErrorHandler(error);
  }
}
