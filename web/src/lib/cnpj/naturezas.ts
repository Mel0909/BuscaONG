// Naturezas jurídicas aceitas no cadastro. Sem código de servidor: as telas também importam.

/**
 * Naturezas do grupo 3 (sem fins lucrativos) que não são ONGs, pela tabela de natureza jurídica do
 * IBGE/CONCLA (código de 4 dígitos, sem o hífen). Decisão de 19/11/2026, ver docs/buscaong.md §4.
 */
export const NATUREZAS_RECUSADAS: Readonly<Record<string, string>> = {
  "3034": "serviço notarial e registral (cartório)",
  "3085": "condomínio edilício",
  "3310": "condomínio",
  "3107": "comissão de conciliação prévia",
  "3115": "entidade de mediação e arbitragem",
  "3123": "partido político",
  "3255": "partido político",
  "3263": "partido político",
  "3271": "partido político",
  "3280": "comitê financeiro de partido político",
  "3298": "frente plebiscitária ou referendária",
  "3131": "entidade sindical",
  "3247": "fundo privado",
  "3328": "plano de previdência complementar",
};

/** Grupo 3 da tabela da Receita ("entidades sem fins lucrativos"), ex.: 3999 associação privada. */
export const naturezaSemFinsLucrativos = (codigo: string | null | undefined) => !!codigo?.startsWith("3");

/** Natureza que pode se cadastrar: sem fins lucrativos e fora da lista de recusadas. */
export const naturezaAceita = (codigo: string | null | undefined) =>
  naturezaSemFinsLucrativos(codigo) && !Object.hasOwn(NATUREZAS_RECUSADAS, codigo!);
