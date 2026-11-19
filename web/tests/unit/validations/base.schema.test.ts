import { describe, expect, it } from "vitest";
import { emailSchema } from "@/backend/schemas";
import { novaDenunciaSchema } from "@/backend/schemas";

describe("emailSchema", () => {
  it("normaliza para minúsculas, sem espaço nas pontas", () => {
    expect(emailSchema.parse("Contato@CasaLar.org.br")).toBe("contato@casalar.org.br");
    expect(emailSchema.parse("  Contato@CasaLar.org.br ")).toBe("contato@casalar.org.br");
  });

  it("recusa o que não é e-mail, com a mensagem em português", () => {
    const resultado = emailSchema.safeParse("nao-e-email");
    expect(resultado.success).toBe(false);
    expect(resultado.error!.issues[0].message).toBe("E-mail inválido");
  });

  it("aceita até 254 caracteres (limite de um endereço de e-mail)", () => {
    const local = "a".repeat(64);
    const dominio = `${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(58)}.br`; // 189 caracteres
    const email = `${local}@${dominio}`;
    expect(email.length).toBe(254);
    expect(emailSchema.safeParse(email).success).toBe(true);
  });

  it("recusa endereço maior que 254 caracteres", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(59)}.br`;
    expect(email.length).toBe(255);
    expect(emailSchema.safeParse(email).success).toBe(false);
  });

  it("a denúncia não guarda e-mail gigante", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(59)}.br`;
    const resultado = novaDenunciaSchema.safeParse({ ongId: "6ae649983bbad49560772d32", motivo: "OUTRO", email });
    expect(resultado.success).toBe(false);
  });
});
