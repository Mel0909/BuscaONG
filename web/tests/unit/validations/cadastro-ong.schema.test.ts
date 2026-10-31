import { describe, expect, it } from "vitest";
import {
  causasItensSchema,
  contatosSchema,
  envioImagemSchema,
  localizacaoSchema,
  voluntariadoSchema,
} from "@/backend/schemas";

const mensagens = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues.map((i) => i.message) ?? [];

describe("localizacaoSchema", () => {
  const valido = {
    endereco: {
      logradouro: "Rua Domingos de Morais",
      numero: "1200",
      bairro: "Vila Mariana",
      municipio: "São Paulo",
      uf: "sp",
      cep: "04010-100",
    },
    latitude: -23.5893,
    longitude: -46.6345,
  };

  it("normaliza UF, CEP e campos opcionais vazios", () => {
    const r = localizacaoSchema.parse({ ...valido, endereco: { ...valido.endereco, complemento: "  " } });
    expect(r.endereco).toMatchObject({ uf: "SP", cep: "04010100", bairro: "Vila Mariana", complemento: null });
    expect(r.mostrarSoBairro).toBe(false);
  });

  it("exige bairro e CEP", () => {
    const { bairro: _bairro, cep: _cep, ...semBairroNemCep } = valido.endereco;
    const faltando = localizacaoSchema.safeParse({ ...valido, endereco: semBairroNemCep });
    expect(mensagens(faltando)).toEqual(expect.arrayContaining(["Informe o bairro", "Informe o CEP"]));

    const vazios = localizacaoSchema.safeParse({ ...valido, endereco: { ...valido.endereco, bairro: " ", cep: "" } });
    expect(mensagens(vazios)).toEqual(expect.arrayContaining(["Informe o bairro", "Informe o CEP"]));
  });

  it("recusa posição fora do Brasil (ex.: latitude e longitude trocadas)", () => {
    const r = localizacaoSchema.safeParse({ ...valido, latitude: -46.6345, longitude: -23.5893 });
    expect(mensagens(r)).toContain("A posição precisa estar no Brasil");
  });

  it("recusa CEP incompleto e UF inexistente", () => {
    const r = localizacaoSchema.safeParse({ ...valido, endereco: { ...valido.endereco, cep: "0401", uf: "XX" } });
    expect(mensagens(r)).toEqual(expect.arrayContaining(["CEP deve ter 8 dígitos", "UF inválida"]));
  });
});

describe("contatosSchema", () => {
  it("normaliza os contatos e transforma vazios em null", () => {
    const r = contatosSchema.parse({
      whatsapp: { valor: "(11) 97123-4567", visivel: true },
      email: { valor: "", visivel: true },
      site: { valor: "casalar.org.br", visivel: false },
      instagram: { valor: "instagram.com/CasaLar", visivel: true },
    });
    expect(r).toEqual({
      whatsapp: { valor: "+5511971234567", visivel: true },
      email: null,
      site: { valor: "https://casalar.org.br", visivel: false },
      instagram: { valor: "@casalar", visivel: true },
    });
  });

  it("exige WhatsApp ou e-mail visível", () => {
    const r = contatosSchema.safeParse({
      whatsapp: { valor: "(11) 97123-4567", visivel: false },
      instagram: { valor: "@casalar", visivel: true },
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["whatsapp"]);
  });

  it("aponta o campo inválido", () => {
    const r = contatosSchema.safeParse({ whatsapp: { valor: "123", visivel: true } });
    expect(r.error?.issues[0].path).toEqual(["whatsapp", "valor"]);
  });
});

describe("causasItensSchema", () => {
  it("aceita de 1 a 3 causas e exige algum item", () => {
    expect(causasItensSchema.safeParse({ causas: ["saude"], itens: ["fraldas"] }).success).toBe(true);
    expect(causasItensSchema.safeParse({ causas: ["saude"], itens: [], itensLivres: ["Ventilador"] }).success).toBe(true);
    expect(mensagens(causasItensSchema.safeParse({ causas: [], itens: ["fraldas"] }))).toContain(
      "Escolha pelo menos uma causa"
    );
    expect(
      causasItensSchema.safeParse({ causas: ["a", "b", "c", "d"], itens: ["fraldas"] }).success
    ).toBe(false);
    expect(mensagens(causasItensSchema.safeParse({ causas: ["saude"], itens: [] }))).toContain(
      "Escolha pelo menos um item que vocês costumam precisar"
    );
  });
});

describe("voluntariadoSchema", () => {
  const horario = { dia: "SABADO", inicio: 8, fim: 12, atividade: "recreacao" };

  it("aceita horário livre e exige início e fim juntos, com fim depois do início", () => {
    expect(voluntariadoSchema.safeParse({ aceitaVoluntarios: true, horarios: [{ ...horario, inicio: null, fim: null }] }).success).toBe(true);
    expect(voluntariadoSchema.safeParse({ aceitaVoluntarios: true, horarios: [{ ...horario, fim: null }] }).success).toBe(false);
    expect(voluntariadoSchema.safeParse({ aceitaVoluntarios: true, horarios: [{ ...horario, fim: 8 }] }).success).toBe(false);
  });

  it("exige o texto da atividade 'outra' e um horário quando aceita voluntários", () => {
    const r = voluntariadoSchema.safeParse({ aceitaVoluntarios: true, horarios: [{ ...horario, atividade: "outra" }] });
    expect(mensagens(r)).toContain("Escreva qual é a atividade");
    expect(voluntariadoSchema.safeParse({ aceitaVoluntarios: true, horarios: [] }).success).toBe(false);
    expect(voluntariadoSchema.safeParse({ aceitaVoluntarios: false, horarios: [] }).success).toBe(true);
  });
});

describe("envioImagemSchema", () => {
  it("limita tipo e tamanho por tipo de imagem", () => {
    expect(envioImagemSchema.safeParse({ tipo: "logo", contentType: "image/png", tamanho: 1024 }).success).toBe(true);
    expect(envioImagemSchema.safeParse({ tipo: "logo", contentType: "image/gif", tamanho: 1024 }).success).toBe(false);
    expect(envioImagemSchema.safeParse({ tipo: "logo", contentType: "image/png", tamanho: 3 * 1024 * 1024 }).success).toBe(false);
    expect(envioImagemSchema.safeParse({ tipo: "capa", contentType: "image/jpeg", tamanho: 3 * 1024 * 1024 }).success).toBe(true);
  });
});
