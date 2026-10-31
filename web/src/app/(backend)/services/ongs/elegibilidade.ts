import type { CnpjData } from "@/lib/cnpj";

export type MotivoNaoElegivel =
  | "SITUACAO_NAO_ATIVA"
  | "NATUREZA_COM_FINS_LUCRATIVOS";

export type Elegibilidade =
  | { elegivel: true }
  | { elegivel: false; motivo: MotivoNaoElegivel };

/**
 * Regras para uma ONG poder se cadastrar (docs/buscaong.md §4):
 * - situação cadastral ATIVA na Receita;
 * - natureza jurídica do grupo 3 da tabela da Receita ("entidades sem fins lucrativos"),
 *   ou seja, código começando com 3 (ex.: 3999 associação privada, 3069 fundação privada).
 */
export function verificarElegibilidade(dados: CnpjData): Elegibilidade {
  if (dados.situacaoCadastral !== "ATIVA") {
    return { elegivel: false, motivo: "SITUACAO_NAO_ATIVA" };
  }

  if (!dados.naturezaJuridica.codigo?.startsWith("3")) {
    return { elegivel: false, motivo: "NATUREZA_COM_FINS_LUCRATIVOS" };
  }

  return { elegivel: true };
}
