import { z } from "zod";
import { MAX_DETALHE_URGENCIA, PRAZOS_URGENCIA_DIAS } from "@/lib/ong/urgencia";

// Painel da ONG (O2/O3): itens urgentes.

/** Item da ONG: slug da lista fixa ou "livre:<chave>". */
const itemSchema = z.string({ error: "Escolha o item" }).trim().min(1, "Escolha o item").max(60);

/**
 * POST /api/ongs/minha/urgencias: marca um item como urgente, ou edita a urgência dele.
 * Sem `dias`, uma urgência que já existe mantém o prazo (para um item novo, `dias` é obrigatório).
 */
export const urgenciaSchema = z
  .object({
    item: itemSchema,
    detalhe: z
      .string()
      .trim()
      .max(MAX_DETALHE_URGENCIA, `O detalhe deve ter no máximo ${MAX_DETALHE_URGENCIA} caracteres`)
      .nullish()
      .transform((v) => v || null),
    dias: z
      .number({ error: "Escolha o prazo" })
      .refine((d) => (PRAZOS_URGENCIA_DIAS as readonly number[]).includes(d), {
        error: `Escolha o prazo: ${PRAZOS_URGENCIA_DIAS.join(", ")} dias`,
      })
      .optional(),
  })
  .strict();

/** DELETE /api/ongs/minha/urgencias?item=: encerra a urgência antes do prazo. */
export const encerrarUrgenciaSchema = z.object({ item: itemSchema });

export type UrgenciaData = z.infer<typeof urgenciaSchema>;
