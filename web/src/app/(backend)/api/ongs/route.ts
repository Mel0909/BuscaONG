import { NextRequest, NextResponse } from "next/server";
import { isAPIError } from "better-auth/api";

import { filtrosSchema, listaProximasSchema, novaContaOngSchema } from "@/backend/schemas";
import {
  CadastroEmAndamentoError,
  criarContaOng,
  listarOngsProximas,
  EmailEmUsoError,
  OngJaCadastradaError,
  OngNaoElegivelError,
} from "@/backend/services/ongs";
import { CnpjLookupUnavailableError, CnpjNotFoundError } from "@/lib/cnpj";
import { paramsParaFiltrosCrus } from "@/lib/mapa/filtros";
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
const LIMITE_LISTA = { limit: 60, windowMs: 60_000 };

const erro = (message: string, status: number, details?: unknown) =>
  NextResponse.json(toErrorMessage(message, details), { status });

// área pública (P1/P3): ONGs publicadas perto de um ponto, com os filtros da tela
// GET /api/ongs?lat=-23.55&lng=-46.63&limite=30&causa=animais&item=fraldas&dia=SABADO
export async function GET(request: NextRequest) {
  try {
    const limite = rateLimit(`ongs-lista:${clientIp(request)}`, LIMITE_LISTA);
    if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);

    const params = request.nextUrl.searchParams;
    const ponto = listaProximasSchema.safeParse(Object.fromEntries(params));
    if (!ponto.success) return returnInvalidDataErrors(ponto.error);
    const filtros = filtrosSchema.safeParse(paramsParaFiltrosCrus(params));
    if (!filtros.success) return returnInvalidDataErrors(filtros.error);

    const { lat, lng, limite: quantas } = ponto.data;
    return NextResponse.json(await listarOngsProximas({ latitude: lat, longitude: lng }, filtros.data, quantas));
  } catch (error) {
    return zodErrorHandler(error);
  }
}

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
    if (error instanceof CadastroEmAndamentoError) {
      return erro(error.message, 409, { campo: "cnpj", motivo: "EM_ANDAMENTO" });
    }
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
