import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/backend/services/db";
import { resetRateLimit } from "@/utils/api/server";

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { findFirst: vi.fn() },
    denuncia: { create: vi.fn() },
  },
}));

import { POST } from "@/backend/api/denuncias/route";

const db = vi.mocked(prisma, { deep: true });
const ONG_ID = "6ae67eea8cf900bcea8cfe24";

const denunciar = (body: unknown, ip = "1.1.1.1") =>
  POST(
    new NextRequest("http://localhost:3000/api/denuncias", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    })
  );

describe("POST /api/denuncias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    db.ong.findFirst.mockResolvedValue({ id: ONG_ID } as never);
    db.denuncia.create.mockImplementation((async (args: { data: Record<string, unknown> }) => ({
      id: "d1",
      motivo: args.data.motivo,
      createdAt: new Date(),
    })) as never);
  });

  it("cria a denúncia de uma ONG publicada, com relato e e-mail opcionais", async () => {
    const response = await denunciar({ ongId: ONG_ID, motivo: "FECHOU", relato: "  Local fechado.  ", email: "Voce@Email.com" });

    expect(response.status).toBe(201);
    expect(db.ong.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: ONG_ID, status: "PUBLICADA" } }));
    expect(db.denuncia.create.mock.calls[0][0].data).toEqual({
      ongId: ONG_ID,
      motivo: "FECHOU",
      relato: "Local fechado.",
      email: "voce@email.com",
    });
  });

  it("relato e e-mail vazios viram null", async () => {
    await denunciar({ ongId: ONG_ID, motivo: "OUTRO", relato: "", email: "" });
    expect(db.denuncia.create.mock.calls[0][0].data).toMatchObject({ relato: null, email: null });
  });

  it.each([
    ["sem motivo", { ongId: ONG_ID }],
    ["motivo fora da lista", { ongId: ONG_ID, motivo: "ODEIO" }],
    ["ID inválido", { ongId: "abc", motivo: "FECHOU" }],
    ["e-mail inválido", { ongId: ONG_ID, motivo: "FECHOU", email: "nao-e-email" }],
    ["campo a mais", { ongId: ONG_ID, motivo: "FECHOU", status: "ARQUIVADA" }],
  ])("400 %s", async (_, body) => {
    expect((await denunciar(body)).status).toBe(400);
    expect(db.denuncia.create).not.toHaveBeenCalled();
  });

  it("404 para ONG que não está publicada", async () => {
    db.ong.findFirst.mockResolvedValue(null as never);
    expect((await denunciar({ ongId: ONG_ID, motivo: "FECHOU" })).status).toBe(404);
    expect(db.denuncia.create).not.toHaveBeenCalled();
  });

  it("uma denúncia por perfil a cada 24 h por IP", async () => {
    expect((await denunciar({ ongId: ONG_ID, motivo: "FECHOU" })).status).toBe(201);
    const repetida = await denunciar({ ongId: ONG_ID, motivo: "OUTRO" });
    expect(repetida.status).toBe(429);
    expect((await repetida.json()).error.message).toMatch(/já denunciou/);

    // outro perfil, ou outro IP, pode
    expect((await denunciar({ ongId: "6ae67eea8cf900bcea8cfe25", motivo: "FECHOU" })).status).toBe(201);
    expect((await denunciar({ ongId: ONG_ID, motivo: "FECHOU" }, "2.2.2.2")).status).toBe(201);
  });

  it("400 no formato da API para JSON malformado", async () => {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/denuncias", {
        method: "POST",
        body: "{ não é json",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "3.3.3.3" },
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { message: "JSON malformado" } });
    expect(db.denuncia.create).not.toHaveBeenCalled();
  });
});
