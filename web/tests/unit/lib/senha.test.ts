import { describe, expect, it } from "vitest";

import { passwordSchema } from "@/backend/schemas";
import { REQUISITOS_SENHA, SENHA_MAXIMO, senhaAtendeRequisitos } from "@/lib/senha";

describe("regra de senha", () => {
  it.each(["Senha123", "Ésenha123", "SENHAç123"])("aceita %s, na tela e no servidor (letras acentuadas contam)", (senha) => {
    expect(senhaAtendeRequisitos(senha)).toBe(true);
    expect(passwordSchema.safeParse(senha).success).toBe(true);
  });

  it.each([
    ["curta", "Sen1a"],
    ["sem maiúscula", "senha123"],
    ["sem minúscula", "SENHA123"],
    ["sem número", "SenhaForte"],
  ])("recusa senha %s, na tela e no servidor", (_, senha) => {
    expect(senhaAtendeRequisitos(senha)).toBe(false);
    expect(passwordSchema.safeParse(senha).success).toBe(false);
  });

  it("o servidor devolve uma mensagem por requisito que falta, com o mesmo texto da regra", () => {
    const resultado = passwordSchema.safeParse("abc");
    expect(resultado.success).toBe(false);
    const mensagens = resultado.error!.issues.map((i) => i.message);
    expect(mensagens).toEqual(
      REQUISITOS_SENHA.filter((r) => !r.atende("abc")).map((r) => r.mensagem)
    );
  });

  it(`aceita até ${SENHA_MAXIMO} caracteres`, () => {
    const base = "Aa1";
    expect(passwordSchema.safeParse(base + "x".repeat(SENHA_MAXIMO - base.length)).success).toBe(true);
    expect(passwordSchema.safeParse(base + "x".repeat(SENHA_MAXIMO - base.length + 1)).success).toBe(false);
  });
});
