import { NextRequest, NextResponse } from "next/server";

import { bboxSchema, filtrosSchema } from "@/backend/schemas";
import { pinsNoMapa } from "@/backend/services/ongs";
import { paramsParaFiltrosCrus } from "@/lib/mapa/filtros";
import {
  clientIp,
  rateLimit,
  erroDeValidacao,
  tooManyRequests,
  erroNaRota,
} from "@/utils/api/server";

// o mapa pede pins a cada movimento (com espera), então o limite é mais folgado que o da lista
const LIMITE = { limit: 120, windowMs: 60_000 };

// área pública (P1): pins das ONGs publicadas dentro da área visível do mapa
// GET /api/ongs/mapa?bbox=-46.70,-23.60,-46.60,-23.50&causa=animais
export async function GET(request: NextRequest) {
  try {
    const limite = rateLimit(`ongs-mapa:${clientIp(request)}`, LIMITE);
    if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);

    const params = request.nextUrl.searchParams;
    const bbox = bboxSchema.safeParse(params.get("bbox") ?? undefined);
    if (!bbox.success) return erroDeValidacao(bbox.error);
    const filtros = filtrosSchema.safeParse(paramsParaFiltrosCrus(params));
    if (!filtros.success) return erroDeValidacao(filtros.error);

    return NextResponse.json(await pinsNoMapa(bbox.data, filtros.data));
  } catch (error) {
    return erroNaRota(error);
  }
}
