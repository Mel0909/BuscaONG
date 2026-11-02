import { NextRequest, NextResponse } from "next/server";
import { isAPIError } from "better-auth/api";
import type { ZodType } from "zod";
import { CadastroAlteradoError } from "@/backend/services/ongs/erros";
import { exigirSessaoOng, rateLimit, returnInvalidDataErrors, tooManyRequests } from "@/utils/api/server";
import { toErrorMessage } from "@/utils/api/toErrorMessage";
import { respostaDeErro } from "../../_utils/rotaDoCadastro";

export function rotaReinicio<T>(schema: ZodType<T>, acao: (userId: string, email: string, dados: T, headers: Headers) => Promise<Headers | void>, envio = false) {
  return async (request: NextRequest) => {
    try {
      const sessao = await exigirSessaoOng(request);
      if (sessao instanceof NextResponse) return sessao;
      // Proteção adicional para a ação destrutiva autenticada por cookie.
      if (request.headers.get("origin") !== request.nextUrl.origin) {
        return NextResponse.json(toErrorMessage("Origem da requisição inválida"), { status: 403 });
      }
      const limite = rateLimit(`reinicio:${envio ? "envio" : "confirmacao"}:${sessao.userId}`, { limit: envio ? 3 : 5, windowMs: 60_000 });
      if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);
      let corpo: unknown;
      try { corpo = await request.json(); } catch {
        return NextResponse.json(toErrorMessage("JSON malformado"), { status: 400 });
      }
      const resultado = schema.safeParse(corpo);
      if (!resultado.success) return returnInvalidDataErrors(resultado.error);
      const headers = await acao(sessao.userId, sessao.email, resultado.data, request.headers);
      const response = NextResponse.json({ ok: true, passoAtual: envio ? undefined : 3 });
      // A prova por OTP renova a sessão da mesma conta, sem expor o token no corpo.
      if (headers) for (const cookie of headers.getSetCookie()) response.headers.append("set-cookie", cookie);
      return response;
    } catch (error) {
      if (error instanceof CadastroAlteradoError) return NextResponse.json(toErrorMessage(error.message), { status: 409 });
      if (isAPIError(error)) return NextResponse.json(toErrorMessage("Código inválido, expirado ou limite de tentativas atingido. Aguarde e solicite outro."), { status: error.status === "TOO_MANY_REQUESTS" ? 429 : 400 });
      return respostaDeErro(error);
    }
  };
}
