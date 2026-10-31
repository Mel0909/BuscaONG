import { NextRequest, NextResponse } from "next/server";

import { sugestaoItensSchema } from "@/backend/schemas";
import { sugerirItensLivres } from "@/backend/services/ongs";
import { exigirSessaoOng, returnInvalidDataErrors, zodErrorHandler } from "@/utils/api/server";

// passo 5 do cadastro: itens fora da lista que outras ONGs já usaram (GET /api/itens-livres?q=ventil)
export async function GET(request: NextRequest) {
  try {
    const sessao = await exigirSessaoOng(request);
    if (sessao instanceof NextResponse) return sessao;

    const resultado = sugestaoItensSchema.safeParse({ q: request.nextUrl.searchParams.get("q") ?? "" });
    if (!resultado.success) return returnInvalidDataErrors(resultado.error);

    return NextResponse.json(await sugerirItensLivres(sessao.userId, resultado.data.q));
  } catch (error) {
    return zodErrorHandler(error);
  }
}
