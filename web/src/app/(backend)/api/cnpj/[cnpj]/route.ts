import { NextRequest, NextResponse } from "next/server";

import { cnpjSchema } from "@/backend/schemas";
import { consultarCnpjParaCadastro } from "@/backend/services/ongs";
import { CnpjLookupUnavailableError, CnpjNotFoundError } from "@/lib/cnpj";
import {
  clientIp,
  rateLimit,
  returnInvalidDataErrors,
  tooManyRequests,
  zodErrorHandler,
} from "@/utils/api/server";
import { toErrorMessage } from "@/utils/api/toErrorMessage";

// pública: usada no passo 1 do cadastro, antes de existir conta
const LIMITE = { limit: 20, windowMs: 60_000 };

// consulta o CNPJ na Receita e diz se ele pode criar uma conta de ONG
export async function GET(request: NextRequest, { params }: { params: Promise<{ cnpj: string }> }) {
  try {
    const limite = rateLimit(`cnpj:${clientIp(request)}`, LIMITE);
    if (!limite.ok) {
      return tooManyRequests(limite.retryAfterSeconds);
    }

    const { cnpj } = await params;
    const validationResult = cnpjSchema.safeParse(cnpj);

    if (!validationResult.success) {
      return returnInvalidDataErrors(validationResult.error);
    }

    const consulta = await consultarCnpjParaCadastro(validationResult.data);
    return NextResponse.json(consulta);
  } catch (error) {
    if (error instanceof CnpjNotFoundError) {
      return NextResponse.json(toErrorMessage("CNPJ não encontrado na Receita Federal"), { status: 404 });
    }
    if (error instanceof CnpjLookupUnavailableError) {
      return NextResponse.json(
        toErrorMessage("Não foi possível consultar a Receita Federal agora. Tente de novo em instantes."),
        { status: 503 }
      );
    }

    return zodErrorHandler(error);
  }
}
