import { NextRequest, NextResponse } from "next/server";

import { novaDenunciaSchema } from "@/backend/schemas";
import { criarDenuncia, PerfilNaoEncontradoError } from "@/backend/services/denuncias";
import { INTERVALO_DENUNCIA_MS } from "@/lib/denuncia/motivos";
import {
  clientIp,
  rateLimit,
  returnInvalidDataErrors,
  tooManyRequests,
  validBody,
  zodErrorHandler,
} from "@/utils/api/server";
import { toErrorMessage } from "@/utils/api/toErrorMessage";

// pública: além do limite geral, uma denúncia por perfil a cada 24 h por IP
// (a tela também guarda no aparelho; nenhum dos dois é garantia, só freio contra abuso)
const LIMITE = { limit: 10, windowMs: 60 * 60_000 };
const LIMITE_POR_PERFIL = { limit: 1, windowMs: INTERVALO_DENUNCIA_MS };

// P5.1: denúncia de perfil, que entra na fila do admin (A2)
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const geral = rateLimit(`denuncias:${ip}`, LIMITE);
    if (!geral.ok) return tooManyRequests(geral.retryAfterSeconds);

    const body = await validBody(request);
    if (body instanceof NextResponse) return body;

    const resultado = novaDenunciaSchema.safeParse(body);
    if (!resultado.success) return returnInvalidDataErrors(resultado.error);

    const porPerfil = rateLimit(`denuncias:${ip}:${resultado.data.ongId}`, LIMITE_POR_PERFIL);
    if (!porPerfil.ok) {
      return NextResponse.json(toErrorMessage("Você já denunciou este perfil hoje. A equipe vai analisar."), {
        status: 429,
        headers: { "Retry-After": String(porPerfil.retryAfterSeconds) },
      });
    }

    return NextResponse.json(await criarDenuncia(resultado.data), { status: 201 });
  } catch (error) {
    if (error instanceof PerfilNaoEncontradoError) {
      return NextResponse.json(toErrorMessage(error.message), { status: 404 });
    }
    return zodErrorHandler(error);
  }
}
