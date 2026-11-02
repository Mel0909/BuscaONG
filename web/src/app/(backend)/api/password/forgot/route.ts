import { NextRequest, NextResponse } from "next/server";
import { solicitarRecuperacaoSchema } from "@/backend/schemas/recuperacao.schema";
import { solicitarRecuperacao } from "@/backend/services/auth/recuperacao";
import { clientIp, rateLimit, returnInvalidDataErrors, tooManyRequests } from "@/utils/api/server";
import { toErrorMessage } from "@/utils/api/toErrorMessage";

export async function POST(request: NextRequest) {
  const limite = rateLimit(`recuperacao:solicitar:${clientIp(request)}`, { limit: 5, windowMs: 60_000 });
  if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json(toErrorMessage("JSON malformado"), { status: 400 });
  }
  const resultado = solicitarRecuperacaoSchema.safeParse(corpo);
  if (!resultado.success) return returnInvalidDataErrors(resultado.error);
  try {
    await solicitarRecuperacao(resultado.data.email, request.headers);
  } catch {
    // Não registrar e-mail, código ou detalhes do provedor; resposta não revela contas.
    console.error("Não foi possível solicitar a recuperação de acesso.");
  }
  return NextResponse.json({ ok: true });
}
