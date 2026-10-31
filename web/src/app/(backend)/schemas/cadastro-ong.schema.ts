import { z } from "zod";
import { ATIVIDADE_OUTRA, DIAS_VOLUNTARIADO } from "@/lib/cadastro/voluntariado";
import {
  MAX_CAUSAS,
  MAX_DESCRICAO_CURTA,
  MAX_HORARIOS,
  MAX_ITENS_LIVRES,
  TAMANHO_MAXIMO_IMAGEM,
  TIPOS_IMAGEM,
  type TipoImagem,
} from "@/lib/cadastro/limites";
import {
  LIMITES_BRASIL,
  normalizarCep,
  normalizarInstagram,
  normalizarSite,
  normalizarWhatsapp,
  UFS,
} from "@/utils/validations";
import type { DiaVoluntariado } from "@/generated/prisma";
import { emailSchema, slugSchema } from "./base.schema";

// Passos 3 a 8 do cadastro da ONG: corpo de PUT /api/ongs/minha/<seção> e afins.

/** Texto opcional: vazio vira null. */
const textoOpcional = (max: number, nome: string) =>
  z
    .string()
    .trim()
    .max(max, `${nome} deve ter no máximo ${max} caracteres`)
    .nullish()
    .transform((v) => v || null);

const ufSchema = z.string().trim().toUpperCase().pipe(z.enum(UFS, { error: "UF inválida" }));

/** Passo 3: endereço confirmado e posição do pin. */
export const localizacaoSchema = z
  .object({
    endereco: z
      .object({
        logradouro: z.string().trim().min(1, "Informe o endereço").max(150, "Endereço muito longo"),
        numero: textoOpcional(20, "Número"),
        complemento: textoOpcional(100, "Complemento"),
        bairro: z.string({ error: "Informe o bairro" }).trim().min(1, "Informe o bairro").max(100, "Bairro muito longo"),
        municipio: z.string().trim().min(1, "Informe a cidade").max(100, "Cidade muito longa"),
        uf: ufSchema,
        cep: z.string({ error: "Informe o CEP" }).transform((v, ctx) => {
          const cep = normalizarCep(v);
          if (!cep) {
            ctx.addIssue({ code: "custom", message: v.trim() ? "CEP deve ter 8 dígitos" : "Informe o CEP" });
            return z.NEVER;
          }
          return cep;
        }),
      })
      .strict(),
    latitude: z
      .number({ error: "Posição no mapa inválida" })
      .min(LIMITES_BRASIL.latMin, "A posição precisa estar no Brasil")
      .max(LIMITES_BRASIL.latMax, "A posição precisa estar no Brasil"),
    longitude: z
      .number({ error: "Posição no mapa inválida" })
      .min(LIMITES_BRASIL.lngMin, "A posição precisa estar no Brasil")
      .max(LIMITES_BRASIL.lngMax, "A posição precisa estar no Brasil"),
    mostrarSoBairro: z.boolean().default(false),
  })
  .strict();

/** GET /api/geocodificacao: endereço que vira o ponto inicial do pin. */
export const geocodificacaoSchema = z.object({
  logradouro: z.string().trim().max(150).nullish(),
  numero: z.string().trim().max(20).nullish(),
  bairro: z.string().trim().max(100).nullish(),
  municipio: z.string().trim().min(1, "Informe a cidade").max(100),
  uf: ufSchema,
  cep: z.string().trim().max(9).nullish(),
});

/** Um contato do passo 4: valor vazio vira null; valor inválido vira erro no campo `valor`. */
const contatoSchema = (normalizar: (valor: string) => string | null, mensagem: string) =>
  z
    .object({ valor: z.string().trim().max(200), visivel: z.boolean().default(true) })
    .strict()
    .transform((contato, ctx) => {
      if (!contato.valor) return null;
      const valor = normalizar(contato.valor);
      if (!valor) {
        ctx.addIssue({ code: "custom", message: mensagem, path: ["valor"] });
        return z.NEVER;
      }
      return { valor, visivel: contato.visivel };
    })
    .nullish()
    .transform((c) => c ?? null);

const normalizarEmail = (valor: string) => {
  const resultado = emailSchema.safeParse(valor);
  return resultado.success ? resultado.data : null;
};

/** Passo 4: contatos e redes. Pelo menos WhatsApp ou e-mail, e visível. */
export const contatosSchema = z
  .object({
    whatsapp: contatoSchema(normalizarWhatsapp, "WhatsApp inválido. Use DDD e número, ex.: (11) 97123-4567"),
    email: contatoSchema(normalizarEmail, "E-mail inválido"),
    site: contatoSchema(normalizarSite, "Site inválido"),
    instagram: contatoSchema(normalizarInstagram, "Instagram inválido. Use @usuario ou o link do perfil"),
  })
  .strict()
  .refine((c) => c.whatsapp?.visivel || c.email?.visivel, {
    error: "Deixe pelo menos um contato (WhatsApp ou e-mail) preenchido e visível na página",
    path: ["whatsapp"],
  });

/** Passo 5: causas e itens. Os slugs são conferidos com as listas fixas no service. */
export const causasItensSchema = z
  .object({
    causas: z
      .array(slugSchema)
      .min(1, "Escolha pelo menos uma causa")
      .max(MAX_CAUSAS, `Escolha no máximo ${MAX_CAUSAS} causas`),
    itens: z.array(slugSchema).max(100),
    itensLivres: z
      .array(z.string().trim().min(2, "Item muito curto").max(40, "Item deve ter no máximo 40 caracteres"))
      .max(MAX_ITENS_LIVRES, `Adicione no máximo ${MAX_ITENS_LIVRES} itens fora da lista`)
      .default([]),
  })
  .strict()
  .refine((c) => c.itens.length + c.itensLivres.length > 0, {
    error: "Escolha pelo menos um item que vocês costumam precisar",
    path: ["itens"],
  });

/** GET /api/itens-livres: sugestões para o campo "Outros itens". */
export const sugestaoItensSchema = z.object({
  q: z.string().trim().min(3, "Digite pelo menos 3 letras").max(40),
});

const horaSchema = z.number().int().min(0).max(24).nullish().transform((v) => v ?? null);
const DIAS = DIAS_VOLUNTARIADO.map((d) => d.valor) as [DiaVoluntariado, ...DiaVoluntariado[]];

export const horarioVoluntariadoSchema = z
  .object({
    dia: z.enum(DIAS, { error: "Dia inválido" }),
    inicio: horaSchema,
    fim: horaSchema,
    atividade: slugSchema,
    atividadeOutra: textoOpcional(60, "Atividade"),
  })
  .strict()
  .refine((h) => (h.inicio === null) === (h.fim === null), {
    error: "Informe o início e o fim do horário, ou escolha horário livre",
    path: ["fim"],
  })
  .refine((h) => h.inicio === null || h.fim === null || h.fim > h.inicio, {
    error: "O fim do horário precisa ser depois do início",
    path: ["fim"],
  })
  .refine((h) => h.atividade !== ATIVIDADE_OUTRA || !!h.atividadeOutra, {
    error: "Escreva qual é a atividade",
    path: ["atividadeOutra"],
  });

/** Passo 6: voluntariado (opcional). Ligado, precisa de pelo menos um horário. */
export const voluntariadoSchema = z
  .object({
    aceitaVoluntarios: z.boolean(),
    horarios: z.array(horarioVoluntariadoSchema).max(MAX_HORARIOS, `No máximo ${MAX_HORARIOS} horários`),
    requisitos: textoOpcional(500, "Requisitos"),
  })
  .strict()
  .refine((v) => !v.aceitaVoluntarios || v.horarios.length > 0, {
    error: "Adicione pelo menos um horário ou desligue “Aceitamos voluntários”",
    path: ["horarios"],
  });

/** Passo 7: apresentação. `logo` e `capa` são chaves devolvidas por POST /api/ongs/minha/imagens. */
export const apresentacaoSchema = z
  .object({
    nomePublico: z.string().trim().min(2, "Informe o nome público").max(80, "Nome público muito longo"),
    descricaoCurta: z
      .string()
      .trim()
      .min(1, "Escreva uma descrição curta")
      .max(MAX_DESCRICAO_CURTA, `A descrição curta deve ter no máximo ${MAX_DESCRICAO_CURTA} caracteres`),
    sobre: textoOpcional(2000, "O texto sobre a ONG"),
    logo: z.string().max(200).nullish().transform((v) => v ?? null),
    capa: z.string().max(200).nullish().transform((v) => v ?? null),
  })
  .strict();

const TIPOS = Object.keys(TIPOS_IMAGEM) as [TipoImagem, ...TipoImagem[]];

/** POST /api/ongs/minha/imagens: pede uma URL para enviar a logo ou a capa. */
export const envioImagemSchema = z
  .object({
    tipo: z.enum(["logo", "capa"], { error: "Tipo de imagem inválido" }),
    contentType: z.enum(TIPOS, { error: "Envie uma imagem JPG, PNG ou WebP" }),
    tamanho: z.number().int().positive("Arquivo vazio"),
  })
  .strict()
  .refine((e) => e.tamanho <= TAMANHO_MAXIMO_IMAGEM[e.tipo], {
    error: "Imagem grande demais (máximo de 2 MB para a logo e 5 MB para a capa)",
    path: ["tamanho"],
  });

/** Passo 8: publicar o perfil. */
export const publicacaoSchema = z
  .object({
    aceitaTermos: z.literal(true, { error: "É preciso aceitar os termos de uso para publicar" }),
  })
  .strict();

export type LocalizacaoData = z.infer<typeof localizacaoSchema>;
export type ContatosData = z.infer<typeof contatosSchema>;
export type CausasItensData = z.infer<typeof causasItensSchema>;
export type VoluntariadoData = z.infer<typeof voluntariadoSchema>;
export type ApresentacaoData = z.infer<typeof apresentacaoSchema>;
export type EnvioImagemData = z.infer<typeof envioImagemSchema>;
