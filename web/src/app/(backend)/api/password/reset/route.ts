import { NextRequest, NextResponse } from "next/server";
import { isAPIError } from "better-auth/api";
import { recuperarSenhaSchema } from "@/backend/schemas/recuperacao.schema";
import { recuperarSenha } from "@/backend/services/auth/recuperacao";
import { clientIp, rateLimit, returnInvalidDataErrors, tooManyRequests } from "@/utils/api/server";
import { toErrorMessage } from "@/utils/api/toErrorMessage";

export async function POST(request: NextRequest) {
  const limite = rateLimit(`recuperacao:confirmar:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json(toErrorMessage("JSON malformado"), { status: 400 });
  }
  const resultado = recuperarSenhaSchema.safeParse(corpo);
  if (!resultado.success) return returnInvalidDataErrors(resultado.error);
  try {
    await recuperarSenha(resultado.data, request.headers);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isAPIError(error)) {
      return NextResponse.json(toErrorMessage("Código incorreto, expirado ou já utilizado. Solicite um novo código."), { status: 400 });
    }
    console.error("Não foi possível concluir a recuperação de acesso.");
    return NextResponse.json(toErrorMessage("Não foi possível redefinir a senha agora. Tente novamente."), { status: 503 });
  }
}
