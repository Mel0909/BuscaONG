import { describe, expect, it, vi } from "vitest";
import { CnpjLookupUnavailableError, CnpjNotFoundError, lookupCnpj } from "@/lib/cnpj";

const CNPJ = "12345678000195";

// formato da BrasilAPI e da Minha Receita
const receitaBody = {
  cnpj: CNPJ,
  razao_social: "ASSOCIACAO CASA LAR ESPERANCA",
  nome_fantasia: "",
  situacao_cadastral: 2,
  descricao_situacao_cadastral: "ATIVA",
  codigo_natureza_juridica: 3999,
  natureza_juridica: "Associação Privada",
  descricao_tipo_de_logradouro: "RUA",
  logradouro: "DOMINGOS DE MORAIS",
  numero: "1200",
  complemento: "",
  bairro: "VILA MARIANA",
  municipio: "SAO PAULO",
  uf: "SP",
  cep: "04010100",
};

// formato do OpenCNPJ
const openCnpjBody = {
  cnpj: CNPJ,
  razao_social: "ASSOCIACAO CASA LAR ESPERANCA",
  nome_fantasia: "CASA LAR",
  situacao_cadastral: "Ativa",
  codigo_natureza_juridica: "3999",
  natureza_juridica: "Associação Privada",
  tipo_logradouro: "RUA",
  logradouro: "DOMINGOS DE MORAIS",
  numero: "1200",
  complemento: "",
  bairro: "VILA MARIANA",
  municipio: "SAO PAULO",
  uf: "SP",
  cep: "04010100",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** fetch falso: cada chave é um trecho da URL de uma API e o valor, o que ela responde. */
function fakeFetch(responses: Record<string, () => Response | Promise<Response>>) {
  return vi.fn(async (url: string | URL | Request) => {
    const href = String(url);
    const match = Object.keys(responses).find((key) => href.includes(key));
    if (!match) throw new Error(`URL inesperada: ${href}`);
    return responses[match]();
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe("lookupCnpj", () => {
  it("usa a BrasilAPI quando ela encontra o CNPJ", async () => {
    const fetchImpl = fakeFetch({ brasilapi: () => json(receitaBody) });

    const data = await lookupCnpj("12.345.678/0001-95", { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toContain(`/cnpj/v1/${CNPJ}`);
    expect(data).toEqual({
      cnpj: CNPJ,
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
    });
  });

  it("cai para a Minha Receita quando a BrasilAPI falha", async () => {
    const fetchImpl = fakeFetch({
      brasilapi: () => json({ message: "erro" }, 500),
      minhareceita: () => json(receitaBody),
    });

    const data = await lookupCnpj(CNPJ, { fetchImpl });

    expect(data.fonte).toBe("minhareceita");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("cai para o OpenCNPJ e converte o formato dele", async () => {
    const fetchImpl = fakeFetch({
      brasilapi: () => Promise.reject(new TypeError("fetch failed")),
      minhareceita: () => json({}, 503),
      opencnpj: () => json(openCnpjBody),
    });

    const data = await lookupCnpj(CNPJ, { fetchImpl });

    expect(data.fonte).toBe("opencnpj");
    expect(data.situacaoCadastral).toBe("ATIVA");
    expect(data.nomeFantasia).toBe("CASA LAR");
    expect(data.naturezaJuridica.codigo).toBe("3999");
  });

  it("tenta a próxima API quando uma diz que não encontrou", async () => {
    const fetchImpl = fakeFetch({
      brasilapi: () => json({ message: "não encontrado" }, 404),
      minhareceita: () => json(receitaBody),
    });

    const data = await lookupCnpj(CNPJ, { fetchImpl });

    expect(data.fonte).toBe("minhareceita");
  });

  it("lança CnpjNotFoundError quando nenhuma encontra e alguma respondeu 404", async () => {
    const fetchImpl = fakeFetch({
      brasilapi: () => json({}, 404),
      minhareceita: () => json({}, 500),
      opencnpj: () => json({ error: "not found" }, 404),
    });

    await expect(lookupCnpj(CNPJ, { fetchImpl })).rejects.toBeInstanceOf(CnpjNotFoundError);
  });

  it("lança CnpjLookupUnavailableError quando todas falham", async () => {
    const fetchImpl = fakeFetch({
      brasilapi: () => json({}, 502),
      minhareceita: () => Promise.reject(new DOMException("timeout", "TimeoutError")),
      opencnpj: () => new Response("<html>", { status: 200 }),
    });

    await expect(lookupCnpj(CNPJ, { fetchImpl })).rejects.toBeInstanceOf(
      CnpjLookupUnavailableError
    );
  });

  it("normaliza o CNPJ alfanumérico na URL", async () => {
    const fetchImpl = fakeFetch({ brasilapi: () => json({ ...receitaBody, cnpj: "12ABC34501DE35" }) });

    const data = await lookupCnpj("12.abc.345/01de-35", { fetchImpl });

    expect(String(fetchImpl.mock.calls[0][0])).toContain("/cnpj/v1/12ABC34501DE35");
    expect(data.cnpj).toBe("12ABC34501DE35");
  });
});
