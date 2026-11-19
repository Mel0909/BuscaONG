import { NextRequest, NextResponse } from "next/server";
import { isAPIError } from "better-auth/api";
import { recuperarSenhaSchema } from "@/backend/schemas/recuperacao.schema";
import { recuperarSenha } from "@/backend/services/auth/recuperacao";
import { clientIp, rateLimit, erroDeValidacao, tooManyRequests, erroJson } from "@/utils/api/server";

export async function POST(request: NextRequest) {
  const limite = rateLimit(`recuperacao:confirmar:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return erroJson(400, "JSON malformado");
  }
  const resultado = recuperarSenhaSchema.safeParse(corpo);
  if (!resultado.success) return erroDeValidacao(resultado.error);
  try {
    await recuperarSenha(resultado.data, request.headers);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAPIError(error)) {
      return erroJson(400, "Código incorreto, expirado ou já utilizado. Solicite um novo código.");
    }
    console.error("Não foi possível concluir a recuperação de acesso.");
    return erroJson(503, "Não foi possível redefinir a senha agora. Tente novamente.");
  }
}
