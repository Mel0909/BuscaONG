import type { CnpjData } from "@/lib/cnpj";
import { naturezaAceita, naturezaSemFinsLucrativos } from "@/lib/cnpj/naturezas";

export type MotivoNaoElegivel =
  | "SITUACAO_NAO_ATIVA"
  | "NATUREZA_COM_FINS_LUCRATIVOS"
  | "NATUREZA_NAO_ACEITA";

export type Elegibilidade =
  | { elegivel: true }
  | { elegivel: false; motivo: MotivoNaoElegivel };

/**
 * Regras para uma ONG poder se cadastrar (docs/buscaong.md §4):
 * - situação cadastral ATIVA na Receita;
 * - natureza jurídica do grupo 3 da tabela da Receita ("entidades sem fins lucrativos"),
 *   ou seja, código começando com 3 (ex.: 3999 associação privada, 3069 fundação privada);
 * - fora das naturezas do grupo 3 que não são ONGs (cartório, condomínio, partido, sindicato...).
 */
export function verificarElegibilidade(dados: CnpjData): Elegibilidade {
  if (dados.situacaoCadastral !== "ATIVA") {
    return { elegivel: false, motivo: "SITUACAO_NAO_ATIVA" };
  }

  const codigo = dados.naturezaJuridica.codigo;
  if (!naturezaSemFinsLucrativos(codigo)) {
    return { elegivel: false, motivo: "NATUREZA_COM_FINS_LUCRATIVOS" };
  }
  if (!naturezaAceita(codigo)) {
    return { elegivel: false, motivo: "NATUREZA_NAO_ACEITA" };
  }

  return { elegivel: true };
}
