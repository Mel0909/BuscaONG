import { describe, expect, it } from "vitest";

import { verificarAmbienteDeProducao } from "@/lib/ambiente";

const completo = {
  DATABASE_URL: "mongodb+srv://exemplo",
  BETTER_AUTH_SECRET: "x".repeat(44),
  BETTER_AUTH_URL: "https://buscaong.org",
  RESEND_API_KEY: "re_exemplo",
  EMAIL_FROM: "BuscaONG <oi@buscaong.org>",
  NEXT_PUBLIC_MAPBOX_TOKEN: "pk.exemplo",
  CRON_SECRET: "abc123",
  R2_ACCOUNT_ID: "conta",
};

describe("verificarAmbienteDeProducao", () => {
  it("ambiente completo não tem erros nem avisos", () => {
    expect(verificarAmbienteDeProducao(completo)).toEqual({ erros: [], avisos: [] });
  });

  it("variável essencial ausente ou só com espaços é erro, com o nome e para que serve", () => {
    const { erros } = verificarAmbienteDeProducao({ ...completo, BETTER_AUTH_SECRET: undefined, RESEND_API_KEY: "  " });
    expect(erros).toHaveLength(2);
    expect(erros[0]).toMatch(/^BETTER_AUTH_SECRET não definida/);
    expect(erros[1]).toMatch(/^RESEND_API_KEY não definida/);
  });

  it("opcionais ausentes e segredo curto só geram aviso", () => {
    const { erros, avisos } = verificarAmbienteDeProducao({
      ...completo,
      CRON_SECRET: "",
      NEXT_PUBLIC_MAPBOX_TOKEN: undefined,
      BETTER_AUTH_SECRET: "curto",
    });
    expect(erros).toEqual([]);
    expect(avisos.join(" ")).toMatch(/CRON_SECRET/);
    expect(avisos.join(" ")).toMatch(/NEXT_PUBLIC_MAPBOX_TOKEN/);
    expect(avisos.join(" ")).toMatch(/menos de 32 caracteres/);
  });

  it("URL do site sem https é erro", () => {
    expect(verificarAmbienteDeProducao({ ...completo, BETTER_AUTH_URL: "http://buscaong.org" }).erros).toEqual([
      "BETTER_AUTH_URL precisa começar com https:// em produção",
    ]);
  });

  it("nunca coloca o valor das variáveis nas mensagens", () => {
    const segredo = "segredo-que-nao-pode-aparecer";
    const { erros, avisos } = verificarAmbienteDeProducao({ ...completo, BETTER_AUTH_SECRET: segredo, DATABASE_URL: "" });
    expect([...erros, ...avisos].join(" ")).not.toContain(segredo);
  });
});
