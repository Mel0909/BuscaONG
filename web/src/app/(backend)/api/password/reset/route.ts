import { NextRequest, NextResponse } from "next/server";
import { isAPIError } from "better-auth/api";
import { recuperarSenhaSchema } from "@/backend/schemas/recuperacao.schema";
import { recuperarSenha } from "@/backend/services/auth/recuperacao";
import {
  clientIp,
  erroDeValidacao,
  erroJson,
  erroNaRota,
  JsonInvalidoError,
  lerJson,
  rateLimit,
  tooManyRequests,
} from "@/utils/api/server";

export async function POST(request: NextRequest) {
  const limite = rateLimit(`recuperacao:confirmar:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);
  try {
    const resultado = recuperarSenhaSchema.safeParse(await lerJson(request));
    if (!resultado.success) return erroDeValidacao(resultado.error);
    await recuperarSenha(resultado.data, request.headers);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof JsonInvalidoError) return erroNaRota(error);
    if (isAPIError(error)) {
      return erroJson(400, "Código incorreto, expirado ou já utilizado. Solicite um novo código.");
    }
    console.error("Não foi possível concluir a recuperação de acesso.");
    return erroJson(503, "Não foi possível redefinir a senha agora. Tente novamente.");
  }
}
