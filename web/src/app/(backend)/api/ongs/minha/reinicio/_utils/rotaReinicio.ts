import { NextRequest, NextResponse } from "next/server";
import { isAPIError } from "better-auth/api";
import type { ZodType } from "zod";
import { CadastroAlteradoError } from "@/backend/services/ongs/erros";
import { exigirSessaoOng, rateLimit, erroDeValidacao, tooManyRequests, erroJson, lerJson } from "@/utils/api/server";
import { respostaDeErro } from "../../_utils/rotaDoCadastro";

export function rotaReinicio<T>(schema: ZodType<T>, acao: (userId: string, email: string, dados: T, headers: Headers) => Promise<Headers | void>, envio = false) {
  return async (request: NextRequest) => {
    try {
      const sessao = await exigirSessaoOng(request);
      if (sessao instanceof NextResponse) return sessao;
      // Proteção adicional para a ação destrutiva autenticada por cookie.
      if (request.headers.get("origin") !== request.nextUrl.origin) {
        return erroJson(403, "Origem da requisição inválida");
      }
      const limite = rateLimit(`reinicio:${envio ? "envio" : "confirmacao"}:${sessao.userId}`, { limit: envio ? 3 : 5, windowMs: 60_000 });
      if (!limite.ok) return tooManyRequests(limite.retryAfterSeconds);
      const resultado = schema.safeParse(await lerJson(request));
      if (!resultado.success) return erroDeValidacao(resultado.error);
      const headers = await acao(sessao.userId, sessao.email, resultado.data, request.headers);
      const response = NextResponse.json({ ok: true, passoAtual: envio ? undefined : 3 });
      // A prova por OTP renova a sessão da mesma conta, sem expor o token no corpo.
      if (headers) for (const cookie of headers.getSetCookie()) response.headers.append("set-cookie", cookie);
      return response;
    } catch (error) {
      if (error instanceof CadastroAlteradoError) return erroJson(409, error.message);
      if (isAPIError(error)) return erroJson(error.status === "TOO_MANY_REQUESTS" ? 429 : 400, "Código inválido, expirado ou limite de tentativas atingido. Aguarde e solicite outro.");
      return respostaDeErro(error);
    }
  };
}
