import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { corpoDeErro, erroDeValidacao, erroJson, erroNaRota } from "@/utils/api/server";

describe("respostas de erro da API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("monta o corpo { error: { message } } e só inclui details quando há", () => {
    expect(corpoDeErro("Falhou")).toEqual({ error: { message: "Falhou" } });
    expect(corpoDeErro("Falhou", { campo: "cnpj" })).toEqual({ error: { message: "Falhou", details: { campo: "cnpj" } } });
  });

  it("erroJson usa o status e repassa os headers", async () => {
    const resposta = erroJson(429, "Calma", { headers: { "Retry-After": "30" } });
    expect(resposta.status).toBe(429);
    expect(resposta.headers.get("Retry-After")).toBe("30");
    expect(await resposta.json()).toEqual({ error: { message: "Calma" } });
  });

  it("erroDeValidacao devolve 400 com a primeira mensagem e todas por campo", async () => {
    const schema = z.object({ nome: z.string().min(1, "Nome vazio"), idade: z.number({ error: "Idade inválida" }) });
    const resultado = schema.safeParse({ nome: "", idade: "x" });
    if (resultado.success) throw new Error("deveria falhar");

    const resposta = erroDeValidacao(resultado.error);
    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({
      error: {
        message: "Nome vazio",
        details: [
          { campo: "nome", message: "Nome vazio" },
          { campo: "idade", message: "Idade inválida" },
        ],
      },
    });
  });

  it("erroNaRota: Zod vira 400; o resto, 500 genérico sem vazar a mensagem", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const zod = z.string().safeParse(1);
    if (zod.success) throw new Error("deveria falhar");
    expect(erroNaRota(zod.error).status).toBe(400);

    const resposta = erroNaRota(new Error("senha do banco: segredo"));
    expect(resposta.status).toBe(500);
    expect(await resposta.json()).toEqual({ error: { message: "Erro interno do servidor" } });
    expect(log).toHaveBeenCalledOnce();
  });
});
