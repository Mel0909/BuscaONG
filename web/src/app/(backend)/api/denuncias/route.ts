import { NextRequest, NextResponse } from "next/server";

import { novaDenunciaSchema } from "@/backend/schemas";
import { criarDenuncia, PerfilNaoEncontradoError } from "@/backend/services/denuncias";
import { INTERVALO_DENUNCIA_MS } from "@/lib/denuncia/motivos";
import {
  clientIp,
  rateLimit,
  erroDeValidacao,
  tooManyRequests,
  validBody,
  erroJson,
  erroNaRota,
} from "@/utils/api/server";

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
    if (!resultado.success) return erroDeValidacao(resultado.error);

    const porPerfil = rateLimit(`denuncias:${ip}:${resultado.data.ongId}`, LIMITE_POR_PERFIL);
    if (!porPerfil.ok) {
      return erroJson(429, "Você já denunciou este perfil hoje. A equipe vai analisar.", {
        headers: { "Retry-After": String(porPerfil.retryAfterSeconds) },
      });
    }

    return NextResponse.json(await criarDenuncia(resultado.data), { status: 201 });
  } catch (error) {
    if (error instanceof PerfilNaoEncontradoError) {
      return erroJson(404, error.message);
    }
    return erroNaRota(error);
  }
}
