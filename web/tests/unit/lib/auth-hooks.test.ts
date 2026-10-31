import { describe, expect, it } from "vitest";
import { APIError } from "better-auth/api";
import { validarRequisicaoAuth } from "@/lib/auth-hooks";

const request = new Request("http://localhost:3000/api/auth/sign-up/email", { method: "POST" });
const SENHA_OK = "Senha123";

function erroDe(fn: () => void) {
  try {
    fn();
  } catch (error) {
    return error as APIError;
  }
  throw new Error("esperava um erro");
}

describe("validarRequisicaoAuth", () => {
  it("bloqueia o cadastro direto pelo HTTP", () => {
    const erro = erroDe(() =>
      validarRequisicaoAuth({ path: "/sign-up/email", request, body: { password: SENHA_OK } })
    );

    expect(erro).toBeInstanceOf(APIError);
    expect(erro.status).toBe("FORBIDDEN");
  });

  it("deixa o servidor criar a conta (chamada sem request)", () => {
    expect(() =>
      validarRequisicaoAuth({ path: "/sign-up/email", body: { password: SENHA_OK } })
    ).not.toThrow();
  });

  it.each([
    ["curta", "Ab1"],
    ["sem maiúscula", "senha123"],
    ["sem minúscula", "SENHA123"],
    ["sem número", "SenhaForte"],
  ])("rejeita senha %s no cadastro feito pelo servidor", (_, password) => {
    const erro = erroDe(() => validarRequisicaoAuth({ path: "/sign-up/email", body: { password } }));

    expect(erro.status).toBe("BAD_REQUEST");
  });

  it.each([
    ["/change-password", "newPassword"],
    ["/reset-password", "newPassword"],
    ["/email-otp/reset-password", "password"],
  ])("aplica a regra de senha em %s (campo %s)", (path, campo) => {
    expect(() => validarRequisicaoAuth({ path, request, body: { [campo]: "fraca" } })).toThrow(APIError);
    expect(() =>
      validarRequisicaoAuth({ path, request, body: { [campo]: SENHA_OK } })
    ).not.toThrow();
  });

  it("não interfere em outras rotas", () => {
    expect(() =>
      validarRequisicaoAuth({ path: "/sign-in/email", request, body: { password: "x" } })
    ).not.toThrow();
  });
});
