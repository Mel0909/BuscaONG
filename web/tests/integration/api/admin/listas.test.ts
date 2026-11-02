import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/backend/services/db";
import { itemParecido } from "@/backend/services/admin";
import { setCurrentRole } from "../../mocks/auth";

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), aggregateRaw: vi.fn() },
    opcaoLista: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    itemLivreMantido: { upsert: vi.fn() },
    acaoAdmin: { create: vi.fn() },
  },
}));

import { POST as criar } from "@/backend/api/admin/listas/route";
import { DELETE as excluir, PATCH as editar } from "@/backend/api/admin/listas/[id]/route";
import { POST as unificar } from "@/backend/api/admin/listas/[id]/unificacao/route";
import { PUT as reordenar } from "@/backend/api/admin/listas/ordem/route";
import { POST as decidir } from "@/backend/api/admin/itens-livres/route";

const db = vi.mocked(prisma, { deep: true });
const A = "6ae649983bbad49560772d31";
const B = "6ae649983bbad49560772d32";

const requisicao = (metodo: string, body?: unknown) =>
  new NextRequest("http://localhost:3000/api/admin/listas", {
    method: metodo,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
const contexto = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });

const opcao = (id: string, slug: string, nome: string, tipo = "ITEM") => ({ id, tipo, slug, nome, grupo: null, ativa: true, ordem: 0 });
const acao = () => db.acaoAdmin.create.mock.calls[0][0].data;

describe("rotas do admin: listas fixas (A4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentRole("ADMIN");
    db.opcaoLista.findMany.mockResolvedValue([opcao(A, "fraldas", "Fraldas")] as never);
    db.opcaoLista.findUnique.mockResolvedValue(null as never);
    db.opcaoLista.create.mockImplementation((async (args: { data: Record<string, unknown> }) => ({ id: B, ...args.data })) as never);
    db.ong.aggregateRaw.mockResolvedValue([] as never);
    db.ong.findMany.mockResolvedValue([] as never);
  });

  it("cria no fim da lista, com slug a partir do nome", async () => {
    db.opcaoLista.findFirst.mockResolvedValue({ ordem: 9 } as never);
    const response = await criar(requisicao("POST", { tipo: "ITEM", nome: "Cadeira de rodas", grupo: "Saúde" }), contexto());

    expect(response.status).toBe(201);
    expect(db.opcaoLista.create.mock.calls[0][0].data).toEqual({
      tipo: "ITEM",
      nome: "Cadeira de rodas",
      grupo: "Saúde",
      slug: "cadeira-de-rodas",
      ordem: 10,
    });
    expect(acao()).toMatchObject({ tipo: "ADICIONOU_OPCAO", alvo: "“Cadeira de rodas”" });
  });

  it("409 para nome repetido na mesma lista (sem diferenciar acento e maiúscula)", async () => {
    const response = await criar(requisicao("POST", { tipo: "ITEM", nome: "FRALDAS" }), contexto());
    expect(response.status).toBe(409);
    expect(db.opcaoLista.create).not.toHaveBeenCalled();
  });

  it("renomear não mexe no slug e registra o antes e depois", async () => {
    db.opcaoLista.findUnique.mockResolvedValue(opcao(A, "fraldas", "Fraldas") as never);
    db.opcaoLista.update.mockResolvedValue(opcao(A, "fraldas", "Fraldas descartáveis") as never);

    await editar(requisicao("PATCH", { nome: "Fraldas descartáveis" }), contexto({ id: A }));

    expect(db.opcaoLista.update.mock.calls[0][0].data).toEqual({ nome: "Fraldas descartáveis" });
    expect(acao().motivo).toBe("nome: “Fraldas” → “Fraldas descartáveis”");
  });

  it("409 ao excluir opção em uso; exclui a que ninguém usa", async () => {
    db.opcaoLista.findUnique.mockResolvedValue(opcao(A, "fraldas", "Fraldas") as never);
    db.ong.aggregateRaw.mockResolvedValue([{ _id: "fraldas", ongs: 4 }] as never);
    const emUso = await excluir(requisicao("DELETE"), contexto({ id: A }));
    expect(emUso.status).toBe(409);
    expect((await emUso.json()).error.message).toMatch(/4 ONGs usam/);

    db.ong.aggregateRaw.mockResolvedValue([] as never);
    expect((await excluir(requisicao("DELETE"), contexto({ id: A }))).status).toBe(200);
    expect(db.opcaoLista.delete).toHaveBeenCalledWith({ where: { id: A } });
  });

  it("unificar passa as ONGs (e as urgências) para o destino e apaga a origem", async () => {
    db.opcaoLista.findUnique.mockImplementation((async (args: { where: { id: string } }) =>
      args.where.id === A ? opcao(A, "fralda-g", "Fralda G") : opcao(B, "fraldas", "Fraldas")) as never);
    db.ong.findMany.mockResolvedValue([
      { id: "o1", itens: ["fralda-g", "leite"], urgencias: [{ item: "fralda-g", nome: "Fralda G" }] },
      { id: "o2", itens: ["fralda-g", "fraldas"], urgencias: [] },
    ] as never);

    const response = await unificar(requisicao("POST", { destinoId: B }), contexto({ id: A }));

    expect(response.status).toBe(200);
    expect(db.ong.findMany.mock.calls[0][0]?.where).toEqual({ itens: { has: "fralda-g" } });
    expect(db.ong.update.mock.calls[0][0].data).toEqual({ itens: ["fraldas", "leite"], urgencias: [{ item: "fraldas", nome: "Fraldas" }] });
    expect(db.ong.update.mock.calls[1][0].data).toMatchObject({ itens: ["fraldas"] });
    expect(db.opcaoLista.delete).toHaveBeenCalledWith({ where: { id: A } });
    expect(acao()).toMatchObject({ tipo: "UNIFICOU_OPCOES", alvo: "“Fralda G” → “Fraldas”", motivo: "2 ONGs passaram para “Fraldas”" });
  });

  it("409 ao unificar listas diferentes", async () => {
    db.opcaoLista.findUnique.mockImplementation((async (args: { where: { id: string } }) =>
      args.where.id === A ? opcao(A, "idosos", "Idosos", "CAUSA") : opcao(B, "fraldas", "Fraldas")) as never);
    expect((await unificar(requisicao("POST", { destinoId: B }), contexto({ id: A }))).status).toBe(409);
  });

  it("reordenar exige exatamente as opções da lista", async () => {
    db.opcaoLista.findMany.mockResolvedValue([{ id: A }, { id: B }] as never);
    expect((await reordenar(requisicao("PUT", { tipo: "ITEM", ids: [A] }), contexto())).status).toBe(409);

    expect((await reordenar(requisicao("PUT", { tipo: "ITEM", ids: [B, A] }), contexto())).status).toBe(200);
    expect(db.opcaoLista.update.mock.calls.map((c) => [c[0].where.id, c[0].data.ordem])).toEqual([
      [B, 0],
      [A, 1],
    ]);
  });

  describe("itens escritos à mão (POST /api/admin/itens-livres)", () => {
    beforeEach(() => {
      const ongs = [
        { id: "o1", itens: ["leite"], itensLivres: [{ nome: "cadeira de rodas", chave: "cadeira de rodas" }], urgencias: [{ item: "livre:cadeira de rodas", nome: "cadeira de rodas" }] },
        { id: "o2", itens: [], itensLivres: [{ nome: "Cadeira de rodas", chave: "cadeira de rodas" }, { nome: "Jornal", chave: "jornal" }], urgencias: [] },
      ];
      db.ong.findFirst.mockResolvedValue(ongs[0] as never);
      db.ong.findMany.mockResolvedValue(ongs as never);
    });

    it("adicionar cria o item e passa as ONGs do texto livre para ele", async () => {
      db.opcaoLista.findMany.mockResolvedValue([] as never);
      const response = await decidir(requisicao("POST", { acao: "ADICIONAR", chave: "cadeira de rodas" }), contexto());

      expect(response.status).toBe(200);
      expect(db.opcaoLista.create.mock.calls[0][0].data).toMatchObject({ nome: "Cadeira de rodas", slug: "cadeira-de-rodas" });
      expect(db.ong.update.mock.calls[0][0].data).toEqual({
        itensLivres: [],
        itens: ["leite", "cadeira-de-rodas"],
        urgencias: [{ item: "cadeira-de-rodas", nome: "Cadeira de rodas" }],
      });
      expect(db.ong.update.mock.calls[1][0].data).toMatchObject({ itensLivres: [{ chave: "jornal" }], itens: ["cadeira-de-rodas"] });
      expect(acao()).toMatchObject({ tipo: "ADICIONOU_ITEM_LIVRE", motivo: "2 ONGs usavam em texto livre" });
    });

    it("unificar passa para um item que já existe", async () => {
      db.opcaoLista.findUnique.mockResolvedValue(opcao(A, "cadeira-rodas", "Cadeira de rodas") as never);
      await decidir(requisicao("POST", { acao: "UNIFICAR", chave: "cadeira de rodas", destinoId: A }), contexto());

      expect(db.opcaoLista.create).not.toHaveBeenCalled();
      expect(db.ong.update.mock.calls[0][0].data).toMatchObject({ itens: ["leite", "cadeira-rodas"] });
      expect(acao()).toMatchObject({ tipo: "UNIFICOU_ITEM_LIVRE" });
    });

    it("manter tira das sugestões, sem mexer nas ONGs", async () => {
      await decidir(requisicao("POST", { acao: "MANTER", chave: "cadeira de rodas" }), contexto());
      expect(db.itemLivreMantido.upsert).toHaveBeenCalled();
      expect(db.ong.update).not.toHaveBeenCalled();
    });
  });

  it("403 para conta de ONG", async () => {
    setCurrentRole("ONG");
    expect((await criar(requisicao("POST", { tipo: "ITEM", nome: "Algo" }), contexto())).status).toBe(403);
  });
});

describe("item parecido (sugestões do texto livre)", () => {
  const itens = [{ nome: "Fraldas" }, { nome: "Ventilador" }, { nome: "Leite em pó" }];

  it.each([
    ["ventilador de teto", "Ventilador"],
    ["fralda geriatrica g", "Fraldas"],
    ["leite", "Leite em pó"],
    ["bolsa de colostomia", null],
  ])("%s → %s", (chave, esperado) => {
    expect(itemParecido(chave, itens)?.nome ?? null).toBe(esperado);
  });
});
