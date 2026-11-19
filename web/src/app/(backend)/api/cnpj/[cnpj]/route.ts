import { NextRequest, NextResponse } from "next/server";

import { cnpjSchema } from "@/backend/schemas";
import { consultarCnpjParaCadastro } from "@/backend/services/ongs";
import { CnpjLookupUnavailableError, CnpjNotFoundError } from "@/lib/cnpj";
import {
  clientIp,
  rateLimit,
  erroDeValidacao,
  tooManyRequests,
  erroJson,
  erroNaRota,
} from "@/utils/api/server";

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
      return erroDeValidacao(validationResult.error);
    }

    const consulta = await consultarCnpjParaCadastro(validationResult.data);
    return NextResponse.json(consulta);
  } catch (error) {
    if (error instanceof CnpjNotFoundError) {
      return erroJson(404, "CNPJ não encontrado na Receita Federal");
    }
    if (error instanceof CnpjLookupUnavailableError) {
      return erroJson(503, "Não foi possível consultar a Receita Federal agora. Tente de novo em instantes.");
    }

    return erroNaRota(error);
  }
}
