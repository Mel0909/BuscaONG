import { NextRequest, NextResponse } from "next/server";

import { geocodificacaoSchema } from "@/backend/schemas";
import { geocodificar } from "@/lib/geocodificacao";
import {
  exigirSessaoOng,
  rateLimit,
  erroDeValidacao,
  tooManyRequests,
  erroJson,
  erroNaRota,
} from "@/utils/api/server";

// o Nominatim aceita 1 consulta por segundo no total; o limite por conta evita que uma só esgote
const LIMITE = { limit: 10, windowMs: 60_000 };

// passo 3 do cadastro: endereço → ponto inicial do pin (a ONG ajusta arrastando)
export async function GET(request: NextRequest) {
  try {
    const sessao = await exigirSessaoOng(request);
    if (sessao instanceof NextResponse) return sessao;

    const limite = rateLimit(`geocodificacao:${sessao.userId}`, LIMITE);
    if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);

    const resultado = geocodificacaoSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!resultado.success) return erroDeValidacao(resultado.error);

    let ponto;
    try {
      ponto = await geocodificar(resultado.data);
    } catch {
      return erroJson(503, "Não foi possível localizar o endereço agora. Posicione o pin no mapa.");
    }

    if (!ponto) {
      return erroJson(404, "Endereço não encontrado no mapa. Posicione o pin.");
    }
    return NextResponse.json(ponto);
  } catch (error) {
    return erroNaRota(error);
  }
}
