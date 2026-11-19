import { z } from "zod";
import { emailSchema, passwordSchema } from "./base.schema";

export const codigoEmailSchema = z.string().regex(/^[0-9]{6}$/, "Digite os seis números do código");
export const solicitarRecuperacaoSchema = z.object({ email: emailSchema }).strict();
export const recuperarSenhaSchema = solicitarRecuperacaoSchema.extend({
  codigo: codigoEmailSchema,
  newPassword: passwordSchema,
});
export const confirmarReinicioSchema = z.object({ codigo: codigoEmailSchema, confirmar: z.literal(true) }).strict();
export const solicitarReinicioSchema = z.object({}).strict();
