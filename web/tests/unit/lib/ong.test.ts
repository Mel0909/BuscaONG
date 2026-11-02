import { describe, expect, it } from "vitest";
import { ehObjectId, slugDoNome, slugLivre } from "@/lib/ong/slug";
import { prazoRestante, tempoDesde, urgenciaAtiva } from "@/lib/ong/urgencia";

describe("slug da página da ONG", () => {
  it.each([
    ["Casa Lar Esperança", "casa-lar-esperanca"],
    ["  Abrigo  Patas & Amigas! ", "abrigo-patas-e-amigas"],
    ["ONG 123 — São Paulo", "ong-123-sao-paulo"],
    ["!!!", "ong"],
  ])("%s → %s", (nome, slug) => {
    expect(slugDoNome(nome)).toBe(slug);
  });

  it("corta em 60 caracteres sem deixar hífen no fim", () => {
    const slug = slugDoNome("Associação Beneficente dos Amigos do Bairro da Vila Mariana e Arredores");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("pula slugs ocupados e as rotas fixas de /ong", async () => {
    const ocupados = new Set(["casa-lar", "casa-lar-2"]);
    expect(await slugLivre("Casa Lar", async (s) => ocupados.has(s))).toBe("casa-lar-3");
    expect(await slugLivre("Painel", async () => false)).toBe("painel-2");
  });

  it("reconhece IDs do MongoDB", () => {
    expect(ehObjectId("6ae67eea8cf900bcea8cfe24")).toBe(true);
    expect(ehObjectId("casa-lar")).toBe(false);
  });
});

describe("urgência", () => {
  const agora = new Date("2026-11-02T12:00:00-03:00");

  it("vale até o prazo", () => {
    expect(urgenciaAtiva({ ate: new Date("2026-11-02T12:01:00-03:00") }, agora)).toBe(true);
    expect(urgenciaAtiva({ ate: "2026-11-02T11:59:00-03:00" }, agora)).toBe(false);
  });

  it.each([
    ["2026-11-02T11:59:30-03:00", "agora"],
    ["2026-11-02T11:15:00-03:00", "há 45 min"],
    ["2026-11-02T10:00:00-03:00", "há 2 h"],
    ["2026-11-01T10:00:00-03:00", "há 1 dia"],
    ["2026-10-28T10:00:00-03:00", "há 5 dias"],
  ])("criada em %s → %s", (criada, texto) => {
    expect(tempoDesde(criada, agora)).toBe(texto);
  });

  it("prazo restante", () => {
    expect(prazoRestante("2026-11-03T10:00:00-03:00", agora)).toBe("até amanhã");
    expect(prazoRestante("2026-11-06T10:00:00-03:00", agora)).toBe("até sexta");
    expect(prazoRestante("2026-11-16T10:00:00-03:00", agora)).toBe("até 16/11");
    expect(prazoRestante("2026-11-01T10:00:00-03:00", agora)).toBe("encerrada");
  });
});
