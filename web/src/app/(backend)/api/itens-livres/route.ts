import { NextRequest, NextResponse } from "next/server";

import { sugestaoItensSchema } from "@/backend/schemas";
import { sugerirItensLivres } from "@/backend/services/ongs";
import {
  exigirSessaoOng,
  rateLimit,
  returnInvalidDataErrors,
  tooManyRequests,
  zodErrorHandler,
} from "@/utils/api/server";

// cada consulta agrega o texto livre de todas as ONGs; a tela consulta enquanto a ONG digita
const LIMITE = { limit: 60, windowMs: 60_000 };

// passo 5 do cadastro: itens fora da lista que outras ONGs já usaram (GET /api/itens-livres?q=ventil)
export async function GET(request: NextRequest) {
  try {
    const sessao = await exigirSessaoOng(request);
    if (sessao instanceof NextResponse) return sessao;

    const limite = rateLimit(`itens-livres:${sessao.userId}`, LIMITE);
    if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);

    const resultado = sugestaoItensSchema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
    if (!resultado.success) return returnInvalidDataErrors(resultado.error);

    return NextResponse.json(await sugerirItensLivres(sessao.userId, resultado.data.q));
  } catch (error) {
    return zodErrorHandler(error);
  }
}
