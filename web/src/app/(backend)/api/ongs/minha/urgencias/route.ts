import { NextRequest, NextResponse } from "next/server";

import { encerrarUrgenciaSchema, urgenciaSchema } from "@/backend/schemas";
import { encerrarUrgencia, marcarUrgencia } from "@/backend/services/ongs";
import { exigirSessaoOng, erroDeValidacao } from "@/utils/api/server";
import { respostaDeErro, rotaDoCadastro } from "../_utils/rotaDoCadastro";

// painel (O3): marca um item da ONG como urgente por 3, 7 ou 14 dias
export const POST = rotaDoCadastro(urgenciaSchema, marcarUrgencia, 201);

// painel (O2): encerra a urgência antes do prazo
// DELETE /api/ongs/minha/urgencias?item=fraldas
export async function DELETE(request: NextRequest) {
  try {
    const sessao = await exigirSessaoOng(request);
    if (sessao instanceof NextResponse) return sessao;

    const resultado = encerrarUrgenciaSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!resultado.success) return erroDeValidacao(resultado.error);

    return NextResponse.json(await encerrarUrgencia(sessao.userId, resultado.data.item));
  } catch (error) {
    return respostaDeErro(error);
  }
}
