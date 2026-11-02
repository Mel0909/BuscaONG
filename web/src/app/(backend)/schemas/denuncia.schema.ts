import { z } from "zod";
import type { MotivoDenuncia } from "@/generated/prisma";
import { MAX_RELATO, MOTIVOS_DENUNCIA } from "@/lib/denuncia/motivos";
import { emailSchema } from "./base.schema";

const MOTIVOS = MOTIVOS_DENUNCIA.map((m) => m.valor) as [MotivoDenuncia, ...MotivoDenuncia[]];

/** ID de documento do MongoDB (ObjectId): 24 caracteres hexadecimais. */
export const objectIdSchema = z.string({ error: "ID inválido" }).regex(/^[a-f0-9]{24}$/, "ID inválido");

export const motivoDenunciaSchema = z.enum(MOTIVOS, { error: "Escolha o que aconteceu" });

/** POST /api/denuncias: denúncia de perfil feita por um visitante (P5.1). */
export const novaDenunciaSchema = z
  .object({
    ongId: objectIdSchema,
    motivo: motivoDenunciaSchema,
    relato: z
      .string()
      .trim()
      .max(MAX_RELATO, `O relato deve ter no máximo ${MAX_RELATO} caracteres`)
      .nullish()
      .transform((v) => v || null),
    email: z
      .union([z.literal(""), emailSchema], { error: "E-mail inválido" })
      .nullish()
      .transform((v) => v || null),
  })
  .strict();

export type NovaDenunciaData = z.infer<typeof novaDenunciaSchema>;
