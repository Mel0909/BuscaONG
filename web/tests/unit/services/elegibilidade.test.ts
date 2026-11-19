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

  it.each([
    ["3034", "Serviço Notarial e Registral (Cartório)"],
    ["3085", "Condomínio Edilício"],
    ["3310", "Demais Condomínios"],
    ["3107", "Comissão de Conciliação Prévia"],
    ["3115", "Entidade de Mediação e Arbitragem"],
    ["3123", "Partido Político (tabela antiga)"],
    ["3131", "Entidade Sindical"],
    ["3247", "Fundo Privado"],
    ["3255", "Órgão de Direção Nacional de Partido Político"],
    ["3263", "Órgão de Direção Regional de Partido Político"],
    ["3271", "Órgão de Direção Local de Partido Político"],
    ["3280", "Comitê Financeiro de Partido Político"],
    ["3298", "Frente Plebiscitária ou Referendária"],
    ["3328", "Plano de Benefícios de Previdência Complementar Fechada"],
  ])("rejeita natureza sem fins lucrativos que não é ONG: %s (%s)", (codigo, descricao) => {
    const dados = cnpjDataMock({ naturezaJuridica: { codigo, descricao } });
    expect(verificarElegibilidade(dados)).toEqual({ elegivel: false, motivo: "NATUREZA_NAO_ACEITA" });
  });

  it.each([
    ["3077", "Serviço Social Autônomo"],
    ["3093", "Unidade Executora (Programa Dinheiro Direto na Escola)"],
    ["3204", "Estabelecimento, no Brasil, de Fundação ou Associação Estrangeiras"],
    ["3239", "Comunidade Indígena"],
    ["3301", "Organização Social (OS)"],
  ])("continua aceitando %s (%s)", (codigo, descricao) => {
    const dados = cnpjDataMock({ naturezaJuridica: { codigo, descricao } });
    expect(verificarElegibilidade(dados)).toEqual({ elegivel: true });
  });

  it("rejeita quando a natureza jurídica não tem código", () => {
    const dados = cnpjDataMock({ naturezaJuridica: { codigo: null, descricao: "" } });
    expect(verificarElegibilidade(dados).elegivel).toBe(false);
  });
});
