import { z } from "zod";

import { REQUISITOS_SENHA, SENHA_MAXIMO } from "@/lib/senha";

/** Senha nova (cadastro, recuperação): os requisitos de lib/senha.ts, até SENHA_MAXIMO caracteres. */
export const passwordSchema = z
  .string({ error: "Informe a senha" })
  .max(SENHA_MAXIMO, `A senha pode ter no máximo ${SENHA_MAXIMO} caracteres`)
  .superRefine((senha, ctx) => {
    for (const requisito of REQUISITOS_SENHA) {
      if (!requisito.atende(senha)) ctx.addIssue({ code: "custom", message: requisito.mensagem });
    }
  });

/**
 * E-mail sem espaços nas pontas e em minúsculas, que é como ele é guardado e comparado.
 * 254 caracteres é o máximo de um endereço (RFC 5321); sem limite, uma rota pública (como a
 * denúncia) gravaria um texto de qualquer tamanho.
 */
export const emailSchema = z
  .string({ error: "Informe o e-mail" })
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo")
  .pipe(z.email("E-mail inválido"));

/** Identificador de uma opção das listas fixas (causa, item, atividade): "cestas-basicas". */
export const slugSchema = z
  .string({ error: "Opção inválida" })
  .trim()
  .min(1, "Opção inválida")
  .max(100, "Opção inválida")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Opção inválida");
