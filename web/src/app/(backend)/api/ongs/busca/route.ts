import { NextRequest, NextResponse } from "next/server";

import { buscaOngSchema } from "@/backend/schemas";
import { buscarOngsPorNome } from "@/backend/services/ongs";
import {
  clientIp,
  rateLimit,
  erroDeValidacao,
  tooManyRequests,
  erroNaRota,
} from "@/utils/api/server";

const LIMITE = { limit: 60, windowMs: 60_000 };

// área pública: campo "ONG ou bairro", parte das ONGs (os lugares vêm da busca do Mapbox, na tela)
// GET /api/ongs/busca?q=casa lar
export async function GET(request: NextRequest) {
  try {
    const limite = rateLimit(`ongs-busca:${clientIp(request)}`, LIMITE);
    if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);

    const resultado = buscaOngSchema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
    if (!resultado.success) return erroDeValidacao(resultado.error);

    return NextResponse.json(await buscarOngsPorNome(resultado.data.q));
  } catch (error) {
    return erroNaRota(error);
  }
}
