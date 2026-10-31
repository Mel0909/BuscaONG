import { describe, expect, it } from "vitest";
import { formatCnpj, isValidCnpj, normalizeCnpj } from "@/utils/validations/cnpj";

describe("normalizeCnpj", () => {
  it("remove máscara e espaços e passa para maiúsculas", () => {
    expect(normalizeCnpj(" 12.abc.345/01de-35 ")).toBe("12ABC34501DE35");
  });
});

describe("isValidCnpj", () => {
  it.each([
    "00.000.000/0001-91",
    "11.222.333/0001-81",
    "12.345.678/0001-95",
    "00000000000191",
  ])("aceita CNPJ numérico válido: %s", (cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(true);
  });

  it.each(["12.ABC.345/01DE-35", "12abc34501de35"])(
    "aceita CNPJ alfanumérico válido: %s",
    (cnpj) => {
      expect(isValidCnpj(cnpj)).toBe(true);
    }
  );

  it.each([
    ["dígito verificador errado", "12.ABC.345/01DE-34"],
    ["dígito verificador errado (numérico)", "11.222.333/0001-82"],
    ["sequência repetida", "00.000.000/0000-00"],
    ["sequência repetida com DV coerente", "00000000000000"],
    ["letra nos dígitos verificadores", "12.ABC.345/01DE-3A"],
    ["curto demais", "12.345.678/0001"],
    ["longo demais", "12.345.678/0001-955"],
    ["vazio", ""],
  ])("rejeita %s", (_, cnpj) => {
    expect(isValidCnpj(cnpj)).toBe(false);
  });
});

describe("formatCnpj", () => {
  it.each([
    ["12", "12"],
    ["12345", "12.345"],
    ["12345678", "12.345.678"],
    ["123456780001", "12.345.678/0001"],
    ["12345678000195", "12.345.678/0001-95"],
    ["12abc34501de35", "12.ABC.345/01DE-35"],
  ])("formata %s como %s", (input, expected) => {
    expect(formatCnpj(input)).toBe(expected);
  });

  it("descarta letras nos dígitos verificadores e o que passar de 14 caracteres", () => {
    expect(formatCnpj("12ABC34501DEX35999")).toBe("12.ABC.345/01DE-35");
  });
});
