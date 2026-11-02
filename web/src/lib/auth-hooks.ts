import { APIError } from "better-auth/api";
import { passwordSchema } from "@/backend/schemas";
import { limitarCodigoEmail } from "./auth-limites";

// rotas do better-auth que recebem uma senha nova, e o campo do corpo onde ela vem
const CAMPOS_SENHA: Record<string, string> = {
  "/sign-up/email": "password",
  "/change-password": "newPassword",
  "/reset-password": "newPassword",
  "/email-otp/reset-password": "password",
};

type ContextoAuth = {
  path?: string;
  request?: Request;
  body?: Record<string, unknown>;
};

/**
 * Roda antes de cada rota do better-auth (hooks.before em auth.ts).
 * - Bloqueia o cadastro direto pelo HTTP (/api/auth/sign-up/email): contas só nascem pelo
 *   POST /api/ongs, junto com a ONG. Chamadas pela API do servidor (auth.api.signUpEmail)
 *   não têm `request` e passam.
 * - Aplica a regra de senha (8+ caracteres, maiúscula, minúscula e número) no servidor.
 */
export function validarRequisicaoAuth(ctx: ContextoAuth): void {
  limitarCodigoEmail(ctx.path, ctx.body?.email);
  if (ctx.path === "/sign-up/email" && ctx.request) {
    throw new APIError("FORBIDDEN", {
      message: "Cadastro direto desativado. Use o cadastro da ONG.",
    });
  }

  const campo = ctx.path ? CAMPOS_SENHA[ctx.path] : undefined;
  if (!campo) return;

  const resultado = passwordSchema.safeParse(ctx.body?.[campo]);
  if (!resultado.success) {
    throw new APIError("BAD_REQUEST", { message: resultado.error.issues[0].message });
  }
}
