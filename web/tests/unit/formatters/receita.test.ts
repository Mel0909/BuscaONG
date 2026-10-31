import { describe, expect, it } from "vitest";
import {
  capitalizarNome,
  formatarEndereco,
  formatarNaturezaJuridica,
} from "@/utils/formatters/receita";

describe("capitalizarNome", () => {
  it.each([
    ["ASSOCIACAO CASA LAR DA ESPERANCA", "Associacao Casa Lar da Esperanca"],
    ["FUNDACAO  DE AMPARO E PESQUISA", "Fundacao de Amparo e Pesquisa"],
    ["DE OLHO NO FUTURO", "De Olho no Futuro"],
  ])("%s → %s", (entrada, saida) => {
    expect(capitalizarNome(entrada)).toBe(saida);
  });
});

describe("formatarNaturezaJuridica", () => {
  it("põe o hífen antes do último dígito", () => {
    expect(formatarNaturezaJuridica("3999")).toBe("399-9");
  });

  it("devolve como veio quando não é um código de 4 dígitos", () => {
    expect(formatarNaturezaJuridica(null)).toBeNull();
    expect(formatarNaturezaJuridica("39")).toBe("39");
  });
});

describe("formatarEndereco", () => {
  const base = {
    tipoLogradouro: "RUA",
    logradouro: "DOMINGOS DE MORAIS",
    numero: "1200",
    bairro: "VILA MARIANA",
    municipio: "SAO PAULO",
    uf: "SP",
  };

  it("monta o endereço com o tipo abreviado", () => {
    expect(formatarEndereco(base)).toBe("R. Domingos de Morais, 1200 — Vila Mariana, Sao Paulo/SP");
  });

  it("usa s/n para endereço sem número", () => {
    expect(formatarEndereco({ ...base, tipoLogradouro: "AVENIDA", numero: "SN" })).toBe(
      "Av. Domingos de Morais, s/n — Vila Mariana, Sao Paulo/SP"
    );
  });

  it("ignora as partes que faltam", () => {
    expect(
      formatarEndereco({ tipoLogradouro: null, logradouro: null, numero: null, bairro: null, municipio: "RECIFE", uf: "PE" })
    ).toBe("Recife/PE");
  });
});
