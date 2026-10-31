import type { CnpjData, CnpjSource } from "./types";

type Provider = {
  source: CnpjSource;
  url: (cnpj: string) => string;
  parse: (body: Record<string, unknown>, cnpj: string) => CnpjData;
};

const text = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" ? null : str;
};

const naturezaCode = (value: unknown): string | null => {
  const code = text(value);
  return code ? code.padStart(4, "0") : null;
};

// BrasilAPI e Minha Receita devolvem o mesmo formato (a BrasilAPI usa a Minha Receita por baixo)
function parseReceitaFormat(source: CnpjSource) {
  return (body: Record<string, unknown>, cnpj: string): CnpjData => ({
    cnpj,
    razaoSocial: text(body.razao_social) ?? "",
    nomeFantasia: text(body.nome_fantasia),
    situacaoCadastral: (text(body.descricao_situacao_cadastral) ?? "").toUpperCase(),
    naturezaJuridica: {
      codigo: naturezaCode(body.codigo_natureza_juridica),
      descricao: text(body.natureza_juridica) ?? "",
    },
    endereco: {
      tipoLogradouro: text(body.descricao_tipo_de_logradouro),
      logradouro: text(body.logradouro),
      numero: text(body.numero),
      complemento: text(body.complemento),
      bairro: text(body.bairro),
      municipio: text(body.municipio),
      uf: text(body.uf),
      cep: text(body.cep),
    },
    fonte: source,
  });
}

export const PROVIDERS: Provider[] = [
  {
    source: "brasilapi",
    url: (cnpj) => `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
    parse: parseReceitaFormat("brasilapi"),
  },
  {
    source: "minhareceita",
    url: (cnpj) => `https://minhareceita.org/${cnpj}`,
    parse: parseReceitaFormat("minhareceita"),
  },
  {
    source: "opencnpj",
    url: (cnpj) => `https://api.opencnpj.org/${cnpj}`,
    parse: (body, cnpj) => ({
      cnpj,
      razaoSocial: text(body.razao_social) ?? "",
      nomeFantasia: text(body.nome_fantasia),
      situacaoCadastral: (text(body.situacao_cadastral) ?? "").toUpperCase(),
      naturezaJuridica: {
        codigo: naturezaCode(body.codigo_natureza_juridica),
        descricao: text(body.natureza_juridica) ?? "",
      },
      endereco: {
        tipoLogradouro: text(body.tipo_logradouro),
        logradouro: text(body.logradouro),
        numero: text(body.numero),
        complemento: text(body.complemento),
        bairro: text(body.bairro),
        municipio: text(body.municipio),
        uf: text(body.uf),
        cep: text(body.cep),
      },
      fonte: "opencnpj",
    }),
  },
];
