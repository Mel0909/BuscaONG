import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/backend/services/db";
import { Prisma } from "@/generated/prisma";
import { limparCacheNomes } from "@/backend/services/ongs";
import { entrarComo } from "../../mocks/auth";

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { findUnique: vi.fn(), update: vi.fn() },
    opcaoLista: { findMany: vi.fn() },
  },
}));

import { DELETE, POST } from "@/backend/api/ongs/minha/urgencias/route";

const db = vi.mocked(prisma, { deep: true });
const DIA = 86_400_000;

const urgencia = (item: string, diasRestantes = 3) => ({
  item,
  nome: item,
  detalhe: null,
  criadaEm: new Date(Date.now() - DIA),
  ate: new Date(Date.now() + diasRestantes * DIA),
});

const ong = (extra: Record<string, unknown> = {}) => ({
  id: "6ae649983bbad49560772d32",
  status: "PUBLICADA",
  updatedAt: new Date("2026-11-01T12:00:00Z"),
  itens: ["fraldas", "leite-em-po"],
  itensLivres: [{ nome: "Ventilador de teto", chave: "ventilador de teto" }],
  urgencias: [],
  ...extra,
});

const marcar = (body: unknown) =>
  POST(
    new NextRequest("http://localhost:3000/api/ongs/minha/urgencias", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  );
const encerrar = (item: string) =>
  DELETE(new NextRequest(`http://localhost:3000/api/ongs/minha/urgencias?${new URLSearchParams({ item })}`, { method: "DELETE" }));

const urgenciasSalvas = () => db.ong.update.mock.calls[0][0].data.urgencias as { item: string; nome: string; ate: Date }[];

describe("/api/ongs/minha/urgencias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limparCacheNomes();
    entrarComo("ONG");
    db.ong.findUnique.mockResolvedValue(ong() as never);
    db.ong.update.mockResolvedValue({} as never);
    db.opcaoLista.findMany.mockResolvedValue([
      { tipo: "ITEM", slug: "fraldas", nome: "Fraldas" },
      { tipo: "ITEM", slug: "leite-em-po", nome: "Leite em pó" },
    ] as never);
  });

  it("marca um item da lista por 7 dias, com o nome do item", async () => {
    const response = await marcar({ item: "fraldas", detalhe: "200 unidades até sexta.", dias: 7 });

    expect(response.status).toBe(201);
    const [salva] = urgenciasSalvas();
    expect(salva).toMatchObject({ item: "fraldas", nome: "Fraldas", detalhe: "200 unidades até sexta." });
    expect(salva.ate.getTime() - Date.now()).toBeGreaterThan(6.9 * DIA);
  });

  it("marca um item livre pela chave", async () => {
    await marcar({ item: "livre:ventilador de teto", dias: 3 });
    expect(urgenciasSalvas()[0]).toMatchObject({ item: "livre:ventilador de teto", nome: "Ventilador de teto", detalhe: null });
  });

  it("remarcar troca a urgência do item e descarta as vencidas", async () => {
    db.ong.findUnique.mockResolvedValue(ong({ urgencias: [urgencia("fraldas"), urgencia("leite-em-po", -1)] }) as never);
    await marcar({ item: "fraldas", detalhe: "Agora 300", dias: 14 });

    expect(urgenciasSalvas()).toHaveLength(1);
    expect(urgenciasSalvas()[0]).toMatchObject({ item: "fraldas", detalhe: "Agora 300" });
  });

  it("editar sem prazo mantém o prazo e quando foi marcada", async () => {
    const antiga = urgencia("fraldas", 2);
    db.ong.findUnique.mockResolvedValue(ong({ urgencias: [antiga] }) as never);
    await marcar({ item: "fraldas", detalhe: "Só o texto mudou" });

    expect(urgenciasSalvas()[0]).toMatchObject({ detalhe: "Só o texto mudou", ate: antiga.ate, criadaEm: antiga.criadaEm });
  });

  it("400 sem prazo para item que ainda não está urgente", async () => {
    expect((await marcar({ item: "fraldas" })).status).toBe(400);
    expect(db.ong.update).not.toHaveBeenCalled();
  });

  it("400 para item que a ONG não tem", async () => {
    const response = await marcar({ item: "brinquedos", dias: 7 });
    expect(response.status).toBe(400);
    expect(db.ong.update).not.toHaveBeenCalled();
  });

  it.each([
    ["prazo fora das opções", { item: "fraldas", dias: 30 }],
    ["detalhe longo demais", { item: "fraldas", dias: 7, detalhe: "x".repeat(121) }],
  ])("400 %s", async (_, body) => {
    expect((await marcar(body)).status).toBe(400);
  });

  it("422 com 5 urgências ativas", async () => {
    db.ong.findUnique.mockResolvedValue(
      ong({ itens: ["a", "b", "c", "d", "e", "fraldas"], urgencias: ["a", "b", "c", "d", "e"].map((i) => urgencia(i)) }) as never
    );
    const response = await marcar({ item: "fraldas", dias: 7 });
    expect(response.status).toBe(422);
  });

  it("403 para ONG suspensa", async () => {
    db.ong.findUnique.mockResolvedValue(ong({ status: "SUSPENSA" }) as never);
    expect((await marcar({ item: "fraldas", dias: 7 })).status).toBe(403);
  });

  it("401 sem login e 403 para admin", async () => {
    entrarComo(null);
    expect((await marcar({ item: "fraldas", dias: 7 })).status).toBe(401);
    entrarComo("ADMIN");
    expect((await marcar({ item: "fraldas", dias: 7 })).status).toBe(403);
  });

  it("grava só se a ONG não mudou desde a leitura; se mudou, 409", async () => {
    await marcar({ item: "fraldas", dias: 7 });
    expect(db.ong.update.mock.calls[0][0].where).toEqual({
      id: "6ae649983bbad49560772d32",
      status: "PUBLICADA",
      updatedAt: new Date("2026-11-01T12:00:00Z"),
    });

    db.ong.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("conflito", { code: "P2025", clientVersion: "6.19.1" }));
    expect((await marcar({ item: "fraldas", dias: 7 })).status).toBe(409);
    expect((await encerrar("fraldas")).status).toBe(409);
  });

  it("encerrar tira só a urgência do item", async () => {
    db.ong.findUnique.mockResolvedValue(ong({ urgencias: [urgencia("fraldas"), urgencia("leite-em-po")] }) as never);
    const response = await encerrar("fraldas");

    expect(response.status).toBe(200);
    expect(urgenciasSalvas().map((u) => u.item)).toEqual(["leite-em-po"]);
  });
});
