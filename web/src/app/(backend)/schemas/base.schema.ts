import { z } from "zod";

export const passwordSchema = z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/\d/, "Senha deve conter pelo menos um número");

// 254 caracteres é o tamanho máximo de um endereço de e-mail (RFC 5321); sem limite, uma rota
// pública (como a denúncia) gravaria um texto de qualquer tamanho
export const emailSchema = z
    .string()
    .max(254, "Email muito longo")
    .email("Email inválido")
    .transform(str => str.toLowerCase().trim());

export const slugSchema = z
    .string({
      error: (issue) => issue.input === undefined 
      ? "Slug é obrigatório" 
      : "Slug deve ser um texto" 
    })
    .min(1, "Slug não pode estar vazio")
    .max(100, "Slug não pode ter mais de 100 caracteres")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens, sem espaços")
    .trim()
