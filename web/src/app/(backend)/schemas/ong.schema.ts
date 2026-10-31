import { z } from "zod";
import { isValidCnpj, normalizeCnpj } from "@/utils/validations/cnpj";

/** CNPJ com ou sem máscara; sai normalizado (14 caracteres, sem pontuação). */
export const cnpjSchema = z
  .string({ error: "CNPJ é obrigatório" })
  .transform(normalizeCnpj)
  .refine(isValidCnpj, { error: "CNPJ inválido" });
