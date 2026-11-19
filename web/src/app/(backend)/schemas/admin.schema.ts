import { z } from "zod";
import type { TipoLista } from "@/generated/prisma";
import { motivoDenunciaSchema, objectIdSchema } from "./denuncia.schema";

// Área admin (A1 a A4). Toda ação que muda algo exige um motivo, que vai para o registro (A3).

const motivo = z
  .string({ error: "Informe o motivo" })
  .trim()
  .min(3, "Informe o motivo")
  .max(300, "O motivo deve ter no máximo 300 caracteres");

/** PATCH /api/admin/ongs/[id]: suspende ou reativa a ONG. */
export const statusOngAdminSchema = z
  .object({ status: z.enum(["SUSPENSA", "PUBLICADA"], { error: "Status inválido" }), motivo })
  .strict();

/** DELETE /api/admin/ongs/[id]: exclui a ONG e a conta dela. */
export const exclusaoOngSchema = z.object({ motivo }).strict();

/** PATCH /api/admin/denuncias: arquiva as denúncias abertas de uma ONG por um motivo. */
export const arquivarDenunciasSchema = z
  .object({ ongId: objectIdSchema, motivo: motivoDenunciaSchema, justificativa: motivo })
  .strict();

const TIPOS_LISTA = ["CAUSA", "ITEM", "ATIVIDADE"] as const satisfies readonly TipoLista[];
export const tipoListaSchema = z.enum(TIPOS_LISTA, { error: "Lista inválida" });

const nomeOpcao = z.string({ error: "Informe o nome" }).trim().min(2, "Nome muito curto").max(40, "Nome muito longo");
const grupoOpcao = z
  .string()
  .trim()
  .max(40, "Grupo muito longo")
  .nullish()
  .transform((v) => v || null);

/** POST /api/admin/listas: nova opção numa lista fixa. */
export const novaOpcaoSchema = z.object({ tipo: tipoListaSchema, nome: nomeOpcao, grupo: grupoOpcao }).strict();

/** PATCH /api/admin/listas/[id]: renomear, mudar o grupo, ativar ou desativar (o slug não muda). */
export const edicaoOpcaoSchema = z
  .object({
    nome: nomeOpcao.optional(),
    // ausente = não muda; vazio = tira o grupo
    grupo: z
      .string()
      .trim()
      .max(40, "Grupo muito longo")
      .nullable()
      .optional()
      .transform((v) => (v === undefined ? undefined : v || null)),
    ativa: z.boolean().optional(),
  })
  .strict()
  .refine((d) => d.nome !== undefined || d.grupo !== undefined || d.ativa !== undefined, {
    error: "Nada para mudar",
  });

/** PUT /api/admin/listas/ordem: nova ordem de uma lista (ordem dos filtros e do cadastro). */
export const ordemListaSchema = z
  .object({ tipo: tipoListaSchema, ids: z.array(objectIdSchema).min(1).max(500) })
  .strict();

/** POST /api/admin/listas/[id]/unificacao: passa as ONGs desta opção para outra e apaga esta. */
export const unificacaoOpcaoSchema = z.object({ destinoId: objectIdSchema }).strict();

/** POST /api/admin/itens-livres: o que fazer com um item escrito à mão pelas ONGs. */
export const decisaoItemLivreSchema = z
  .discriminatedUnion("acao", [
    z.object({ acao: z.literal("ADICIONAR"), chave: z.string().trim().min(1).max(60), grupo: grupoOpcao }).strict(),
    z.object({ acao: z.literal("UNIFICAR"), chave: z.string().trim().min(1).max(60), destinoId: objectIdSchema }).strict(),
    z.object({ acao: z.literal("MANTER"), chave: z.string().trim().min(1).max(60) }).strict(),
  ], { error: "Ação inválida" });

/**
 * PATCH /api/admin/imagens (A5): "ok" ou remover a logo ou a capa nova de uma ONG.
 * `chave` é a imagem que o admin viu: se a ONG trocou depois, a ação não vale (409).
 */
export const revisaoImagemSchema = z.discriminatedUnion(
  "acao",
  [
    z.object({ acao: z.literal("APROVAR"), ongId: objectIdSchema, tipo: z.enum(["logo", "capa"]), chave: z.string().min(1).max(200) }).strict(),
    z
      .object({ acao: z.literal("REMOVER"), ongId: objectIdSchema, tipo: z.enum(["logo", "capa"]), chave: z.string().min(1).max(200), motivo })
      .strict(),
  ],
  { error: "Ação inválida" }
);

/** Categorias do filtro do registro de ações (A3). */
export const CATEGORIAS_ACAO = ["todas", "suspensoes", "exclusoes", "denuncias", "imagens", "listas", "sistema"] as const;

/** GET /api/admin/acoes (CSV) e a página do registro. */
export const filtroAcoesSchema = z.object({
  categoria: z.enum(CATEGORIAS_ACAO).catch("todas"),
  q: z.string().trim().max(80).catch(""),
});

/** Filtros da lista de ONGs (A1). */
export const FILTROS_ONGS_ADMIN = ["todas", "ativas", "suspensas", "cnpj", "denunciadas", "rascunhos"] as const;
export const filtroOngsAdminSchema = z.object({
  filtro: z.enum(FILTROS_ONGS_ADMIN).catch("todas"),
  q: z.string().trim().max(80).catch(""),
});

export type StatusOngAdminData = z.infer<typeof statusOngAdminSchema>;
export type NovaOpcaoData = z.infer<typeof novaOpcaoSchema>;
export type EdicaoOpcaoData = z.infer<typeof edicaoOpcaoSchema>;
export type DecisaoItemLivreData = z.infer<typeof decisaoItemLivreSchema>;
export type RevisaoImagemData = z.infer<typeof revisaoImagemSchema>;
export type CategoriaAcao = (typeof CATEGORIAS_ACAO)[number];
export type FiltroOngsAdmin = (typeof FILTROS_ONGS_ADMIN)[number];
