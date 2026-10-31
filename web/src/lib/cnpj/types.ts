export type CnpjSource = "brasilapi" | "minhareceita" | "opencnpj";

/** Dados de um CNPJ na Receita Federal, no mesmo formato para qualquer API de origem. */
export type CnpjData = {
  /** CNPJ sem máscara (14 caracteres) */
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  /** Descrição da situação cadastral em maiúsculas, ex.: "ATIVA", "BAIXADA" */
  situacaoCadastral: string;
  naturezaJuridica: {
    /** Código de 4 dígitos da tabela da Receita, ex.: "3999" (associação privada) */
    codigo: string | null;
    descricao: string;
  };
  endereco: {
    tipoLogradouro: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    municipio: string | null;
    uf: string | null;
    cep: string | null;
  };
  fonte: CnpjSource;
};

/** Nenhuma API encontrou o CNPJ. */
export class CnpjNotFoundError extends Error {
  constructor(cnpj: string) {
    super(`CNPJ ${cnpj} não encontrado na Receita Federal`);
    this.name = "CnpjNotFoundError";
  }
}

/** Nenhuma API respondeu (erro ou tempo esgotado em todas). */
export class CnpjLookupUnavailableError extends Error {
  constructor() {
    super("Não foi possível consultar a Receita Federal agora");
    this.name = "CnpjLookupUnavailableError";
  }
}
