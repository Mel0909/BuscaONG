import { describe, expect, it } from "vitest";

import { erroNaRota, JsonInvalidoError, lerJson } from "@/utils/api/server";

const requisicao = (corpo?: string) => new Request("http://localhost:3000/api/x", { method: "POST", body: corpo });

describe("lerJson", () => {
  it("devolve o JSON do corpo", async () => {
    expect(await lerJson(requisicao('{"a":1}'))).toEqual({ a: 1 });
  });

  it("lança JsonInvalidoError com JSON malformado", async () => {
    await expect(lerJson(requisicao("{ não é json"))).rejects.toBeInstanceOf(JsonInvalidoError);
  });

  it("corpo vazio é erro, a não ser que a rota diga quanto ele vale", async () => {
    await expect(lerJson(requisicao())).rejects.toBeInstanceOf(JsonInvalidoError);
    expect(await lerJson(requisicao(), { vazio: {} })).toEqual({});
    expect(await lerJson(requisicao("  "), { vazio: {} })).toEqual({});
    // com conteúdo, o valor de "vazio" não esconde JSON malformado
    await expect(lerJson(requisicao("{"), { vazio: {} })).rejects.toBeInstanceOf(JsonInvalidoError);
  });

  it("erroNaRota responde 400 no formato da API", async () => {
    const resposta = erroNaRota(new JsonInvalidoError());
    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({ error: { message: "JSON malformado" } });
  });
});
