import { auth } from "@/auth";
import type { z } from "zod";
import type { recuperarSenhaSchema } from "@/backend/schemas/recuperacao.schema";

export async function solicitarRecuperacao(email: string, headers: Headers) {
  await auth.api.requestPasswordResetEmailOTP({ body: { email }, headers });
}

export async function recuperarSenha(dados: z.infer<typeof recuperarSenhaSchema>, headers: Headers) {
  await auth.api.resetPasswordEmailOTP({
    body: { email: dados.email, otp: dados.codigo, password: dados.newPassword },
    headers,
  });
}
