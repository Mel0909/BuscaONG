import type { CnpjData } from "@/lib/cnpj";

/** Dados de uma ONG elegível na Receita; sobrescreva o que o teste precisar. */
export function cnpjDataMock(overrides: Partial<CnpjData> = {}): CnpjData {
  return {
    cnpj: "12345678000195",
    razaoSocial: "ASSOCIACAO CASA LAR ESPERANCA",
    nomeFantasia: null,
    situacaoCadastral: "ATIVA",
    naturezaJuridica: { codigo: "3999", descricao: "Associação Privada" },
    endereco: {
      tipoLogradouro: "RUA",
      logradouro: "DOMINGOS DE MORAIS",
      numero: "1200",
      complemento: null,
      bairro: "VILA MARIANA",
      municipio: "SAO PAULO",
      uf: "SP",
      cep: "04010100",
    },
    fonte: "brasilapi",
    ...overrides,
  };
}
