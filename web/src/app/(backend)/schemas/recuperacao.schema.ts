import { z } from "zod";
import { passwordSchema } from "./base.schema";

const emailRecuperacao = z.string().trim().toLowerCase().pipe(z.email("E-mail inválido"));
export const codigoEmailSchema = z.string().regex(/^[0-9]{6}$/, "Digite os seis números do código");
export const solicitarRecuperacaoSchema = z.object({ email: emailRecuperacao }).strict();
export const recuperarSenhaSchema = solicitarRecuperacaoSchema.extend({
  codigo: codigoEmailSchema,
  newPassword: passwordSchema.max(128, "Senha deve ter no máximo 128 caracteres"),
});
export const confirmarReinicioSchema = z.object({ codigo: codigoEmailSchema, confirmar: z.literal(true) }).strict();
export const solicitarReinicioSchema = z.object({}).strict();
