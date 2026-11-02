import { createHash } from "node:crypto";
import { APIError } from "better-auth/api";
import { rateLimit } from "@/utils/api/server/rateLimit";

const ENVIOS = new Set([
  "/email-otp/send-verification-otp", "/email-otp/request-password-reset", "/forget-password/email-otp",
]);
const CONFIRMACOES = new Set([
  "/email-otp/reset-password", "/email-otp/verify-email", "/sign-in/email-otp", "/email-otp/check-verification-otp",
]);

/** Compartilha o limite por e-mail entre a API própria e os aliases do better-auth. */
export function limitarCodigoEmail(path?: string, email?: unknown) {
  if (!path || typeof email !== "string") return;
  const envio = ENVIOS.has(path);
  if (!envio && !CONFIRMACOES.has(path)) return;
  const chave = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const limite = rateLimit(`auth:codigo:${envio ? "envio" : "confirmacao"}:${chave}`, {
    limit: envio ? 3 : 10, windowMs: 60_000,
  });
  if (!limite.ok) throw new APIError("TOO_MANY_REQUESTS", { message: "Aguarde um minuto antes de tentar novamente." });
}
