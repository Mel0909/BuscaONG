import { describe, expect, it } from "vitest";
import { calcularTurnos, formatarHorario } from "@/lib/cadastro/voluntariado";
import { iniciais, normalizarChave } from "@/utils/formatters/texto";

describe("calcularTurnos", () => {
  it.each([
    [8, 12, ["MANHA"]],
    [14, 17, ["TARDE"]],
    [14, 19, ["TARDE", "NOITE"]],
    [11, 13, ["MANHA", "TARDE"]],
    [19, 22, ["NOITE"]],
    [6, 24, ["MANHA", "TARDE", "NOITE"]],
  ])("%ih–%ih → %j", (inicio, fim, turnos) => {
    expect(calcularTurnos(inicio, fim)).toEqual(turnos);
  });

  it("horário livre vale para os três turnos", () => {
    expect(calcularTurnos(null, null)).toEqual(["MANHA", "TARDE", "NOITE"]);
  });

  it("formata o horário", () => {
    expect(formatarHorario(8, 12)).toBe("8h – 12h");
    expect(formatarHorario(null, null)).toBe("Horário livre");
  });
});

describe("normalizarChave", () => {
  it("tira acento, caixa e espaço sobrando", () => {
    expect(normalizarChave("  Fraldas   Tamanho G ")).toBe("fraldas tamanho g");
    expect(normalizarChave("Remédios")).toBe("remedios");
    expect(normalizarChave("AÇÚCAR")).toBe("acucar");
  });
});

describe("iniciais", () => {
  it.each([
    ["Casa Lar Esperança", "CE"],
    ["Associação de Pais", "AP"],
    ["Abrigo", "AB"],
  ])("%s → %s", (nome, esperado) => {
    expect(iniciais(nome)).toBe(esperado);
  });
});
