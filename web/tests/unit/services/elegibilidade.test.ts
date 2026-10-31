import { describe, expect, it } from "vitest";
import { verificarElegibilidade } from "@/backend/services/ongs/elegibilidade";
import { cnpjDataMock } from "../../integration/mocks/cnpj";

describe("verificarElegibilidade", () => {
  it.each([
    ["3999", "Associação Privada"],
    ["3069", "Fundação Privada"],
    ["3220", "Organização Religiosa"],
  ])("aceita ONG ativa com natureza %s (%s)", (codigo, descricao) => {
    const dados = cnpjDataMock({ naturezaJuridica: { codigo, descricao } });
    expect(verificarElegibilidade(dados)).toEqual({ elegivel: true });
  });

  it.each(["BAIXADA", "INAPTA", "SUSPENSA", "NULA", ""])(
    "rejeita situação cadastral %s",
    (situacaoCadastral) => {
      const dados = cnpjDataMock({ situacaoCadastral });
      expect(verificarElegibilidade(dados)).toEqual({
        elegivel: false,
        motivo: "SITUACAO_NAO_ATIVA",
      });
    }
  );

  it.each([
    ["2062", "Sociedade Empresária Limitada"],
    ["2135", "Empresário (Individual)"],
    ["1031", "Órgão Público do Poder Executivo Municipal"],
  ])("rejeita natureza jurídica %s (%s)", (codigo, descricao) => {
    const dados = cnpjDataMock({ naturezaJuridica: { codigo, descricao } });
    expect(verificarElegibilidade(dados)).toEqual({
      elegivel: false,
      motivo: "NATUREZA_COM_FINS_LUCRATIVOS",
    });
  });

  it("rejeita quando a natureza jurídica não tem código", () => {
    const dados = cnpjDataMock({ naturezaJuridica: { codigo: null, descricao: "" } });
    expect(verificarElegibilidade(dados).elegivel).toBe(false);
  });
});
