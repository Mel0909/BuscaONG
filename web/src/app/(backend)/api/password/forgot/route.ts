import { NextRequest, NextResponse } from "next/server";
import { solicitarRecuperacaoSchema } from "@/backend/schemas/recuperacao.schema";
import { solicitarRecuperacao } from "@/backend/services/auth/recuperacao";
import { clientIp, erroDeValidacao, erroNaRota, lerJson, rateLimit, tooManyRequests } from "@/utils/api/server";

export async function POST(request: NextRequest) {
  const limite = rateLimit(`recuperacao:solicitar:${clientIp(request)}`, { limit: 5, windowMs: 60_000 });
  if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);
  try {
    const resultado = solicitarRecuperacaoSchema.safeParse(await lerJson(request));
    if (!resultado.success) return erroDeValidacao(resultado.error);
    try {
      await solicitarRecuperacao(resultado.data.email, request.headers);
    } catch {
      // Não registrar e-mail, código ou detalhes do provedor; resposta não revela contas.
      console.error("Não foi possível solicitar a recuperação de acesso.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return erroNaRota(error);
  }
}
