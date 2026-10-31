import { z } from "zod";
import { isValidCnpj, normalizeCnpj } from "@/utils/validations/cnpj";
import { emailSchema, passwordSchema } from "./base.schema";

/** CNPJ com ou sem máscara; sai normalizado (14 caracteres, sem pontuação). */
export const cnpjSchema = z
  .string({ error: "CNPJ é obrigatório" })
  .transform(normalizeCnpj)
  .refine(isValidCnpj, { error: "CNPJ inválido" });

/** POST /api/ongs: cria a conta da ONG (passo 2 do cadastro). */
export const novaContaOngSchema = z
  .object({
    cnpj: cnpjSchema,
    email: emailSchema,
    password: passwordSchema,
    // false quando a ONG clicou em "O endereço mudou" no passo 1
    usarEnderecoReceita: z.boolean().default(true),
  })
  .strict(); // rejeita campos extras (ex.: tentar mandar role)
