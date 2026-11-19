import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { JsonInvalidoError } from "./lerJson";

// Respostas de erro da API, no formato de docs/padroes-api.md §4:
// { "error": { "message": "...", "details": ... } }, com "details" só quando houver.

/** Corpo de uma resposta de erro. */
export function corpoDeErro(message: string, details?: unknown) {
  return { error: details === undefined ? { message } : { message, details } };
}

type OpcoesErro = { details?: unknown; headers?: HeadersInit };

/** Resposta de erro com o status dado. */
export function erroJson(status: number, message: string, { details, headers }: OpcoesErro = {}) {
  return NextResponse.json(corpoDeErro(message, details), { status, headers });
}

/** 400 a partir de uma validação do Zod: a primeira mensagem e, em `details`, todas por campo. */
export function erroDeValidacao(error: ZodError) {
  const details = error.issues.map((issue) => ({ campo: issue.path.join("."), message: issue.message }));
  return erroJson(400, details[0]?.message ?? "Dados inválidos", { details });
}

/**
 * Para o `catch` das rotas, depois dos erros que a rota conhece: JSON malformado e validação do
 * Zod viram 400; qualquer outro erro, 500 com mensagem genérica (o detalhe fica só no log do servidor).
 */
export function erroNaRota(error: unknown) {
  if (error instanceof JsonInvalidoError) return erroJson(400, error.message);
  if (error instanceof ZodError) return erroDeValidacao(error);
  console.error("Erro inesperado na API:", error instanceof Error ? `${error.name}: ${error.message}` : error);
  return erroJson(500, "Erro interno do servidor");
}
