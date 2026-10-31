import { describe, expect, it } from "vitest";
import {
  formatarWhatsapp,
  linkWhatsapp,
  normalizarInstagram,
  normalizarSite,
  normalizarWhatsapp,
} from "@/utils/validations/contatos";
import { formatarCep, normalizarCep } from "@/utils/validations/endereco";

describe("normalizarWhatsapp", () => {
  it.each([
    ["(11) 97123-4567", "+5511971234567"],
    ["+55 11 97123-4567", "+5511971234567"],
    ["5511971234567", "+5511971234567"],
    ["011 97123-4567", "+5511971234567"],
    ["(21) 3123-4567", "+552131234567"], // fixo com WhatsApp Business
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarWhatsapp(entrada)).toBe(esperado);
  });

  it.each(["97123-4567", "(11) 87123-4567", "(00) 97123-4567", "abc", ""])("recusa %s", (entrada) => {
    expect(normalizarWhatsapp(entrada)).toBeNull();
  });

  it("formata e monta o link wa.me", () => {
    expect(formatarWhatsapp("+5511971234567")).toBe("+55 (11) 97123-4567");
    expect(formatarWhatsapp("+552131234567")).toBe("+55 (21) 3123-4567");
    expect(linkWhatsapp("+5511971234567")).toBe("https://wa.me/5511971234567");
  });
});

describe("normalizarInstagram", () => {
  it.each([
    ["@casalar", "@casalar"],
    ["CasaLar", "@casalar"],
    ["https://instagram.com/casa.lar_/", "@casa.lar_"],
    ["www.instagram.com/casalar?hl=pt", "@casalar"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarInstagram(entrada)).toBe(esperado);
  });

  it.each(["@casa lar", "@", "a".repeat(31), "@casa-lar"])("recusa %s", (entrada) => {
    expect(normalizarInstagram(entrada)).toBeNull();
  });
});

describe("normalizarSite", () => {
  it("põe https:// quando falta e tira a barra final", () => {
    expect(normalizarSite("casalar.org.br")).toBe("https://casalar.org.br");
    expect(normalizarSite("http://casalar.org.br/")).toBe("http://casalar.org.br");
    expect(normalizarSite("https://casalar.org.br/sobre")).toBe("https://casalar.org.br/sobre");
  });

  it.each(["casalar", "javascript:alert(1)", "ftp://casalar.org.br", "https://"])("recusa %s", (entrada) => {
    expect(normalizarSite(entrada)).toBeNull();
  });
});

describe("CEP", () => {
  it("normaliza e formata", () => {
    expect(normalizarCep("04010-100")).toBe("04010100");
    expect(normalizarCep("0401010")).toBeNull();
    expect(formatarCep("04010100")).toBe("04010-100");
    expect(formatarCep("0401")).toBe("0401");
  });
});
