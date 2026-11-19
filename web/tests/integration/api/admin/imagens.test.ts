import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/backend/services/db";
import { apagarArquivo } from "@/lib/armazenamento";
import { sendEmail } from "@/lib/email";
import { entrarComo } from "../../mocks/auth";

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { findUnique: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    acaoAdmin: { create: vi.fn() },
    $runCommandRaw: vi.fn(),
  },
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/armazenamento", async (original) => ({ ...(await original<object>()), apagarArquivo: vi.fn() }));

import { PATCH } from "@/backend/api/admin/imagens/route";
import { imagensParaRevisar } from "@/backend/services/admin";

const db = vi.mocked(prisma, { deep: true });
const ID = "6ae649983bbad49560772d32";
const LOGO = `ongs/${ID}/logo-0b6f3c1e-5d2a-4c8b-9e7f-1a2b3c4d5e6f.png`;

const ong = (extra: Record<string, unknown> = {}) => ({
  id: ID,
  nomePublico: "Casa Lar",
  razaoSocial: "ASSOCIACAO CASA LAR",
  slug: "casa-lar",
  logo: LOGO,
  capa: null,
  logoRevisada: false,
  capaRevisada: null,
  updatedAt: new Date("2026-11-18T10:00:00Z"),
  user: { email: "acesso@casalar.org" },
  ...extra,
});

const patch = (body: unknown) =>
  PATCH(
    new NextRequest("http://localhost:3000/api/admin/imagens", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({}) }
  );

beforeEach(() => {
  vi.clearAllMocks();
  entrarComo("ADMIN");
  db.ong.findUnique.mockResolvedValue(ong() as never);
  db.$runCommandRaw.mockResolvedValue({ n: 1, ok: 1 } as never);
  db.ong.updateMany.mockResolvedValue({ count: 1 } as never);
  vi.mocked(sendEmail).mockResolvedValue(undefined);
  vi.mocked(apagarArquivo).mockResolvedValue(undefined);
});

describe("PATCH /api/admin/imagens (A5)", () => {
  it("401 sem login e 403 para conta de ONG", async () => {
    entrarComo(null);
    expect((await patch({ acao: "APROVAR", ongId: ID, tipo: "logo", chave: LOGO })).status).toBe(401);
    entrarComo("ONG");
    expect((await patch({ acao: "APROVAR", ongId: ID, tipo: "logo", chave: LOGO })).status).toBe(403);
    expect(db.$runCommandRaw).not.toHaveBeenCalled();
  });

  it("ok marca só a imagem vista, sem mexer no updatedAt, e vai para o registro", async () => {
    const response = await patch({ acao: "APROVAR", ongId: ID, tipo: "logo", chave: LOGO });

    expect(response.status).toBe(200);
    expect(db.$runCommandRaw).toHaveBeenCalledWith({
      update: "ong",
      updates: [{ q: { _id: { $oid: ID }, logo: LOGO }, u: { $set: { logoRevisada: true } } }],
    });
    expect(db.ong.updateMany).not.toHaveBeenCalled();
    expect(db.acaoAdmin.create.mock.calls[0][0].data).toMatchObject({ tipo: "APROVOU_IMAGEM", alvo: "Casa Lar", motivo: "Logo" });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("409 se a ONG trocou a imagem depois que o admin abriu a página", async () => {
    db.$runCommandRaw.mockResolvedValue({ n: 0, ok: 1 } as never);
    expect((await patch({ acao: "APROVAR", ongId: ID, tipo: "logo", chave: LOGO })).status).toBe(409);
    db.ong.updateMany.mockResolvedValue({ count: 0 } as never);
    expect((await patch({ acao: "REMOVER", ongId: ID, tipo: "logo", chave: LOGO, motivo: "Imagem inadequada" })).status).toBe(409);
    expect(apagarArquivo).not.toHaveBeenCalled();
    expect(db.acaoAdmin.create).not.toHaveBeenCalled();
  });

  it("remover tira a imagem do perfil, apaga do R2, registra e avisa a ONG", async () => {
    const response = await patch({ acao: "REMOVER", ongId: ID, tipo: "logo", chave: LOGO, motivo: "Imagem inadequada" });

    expect(response.status).toBe(200);
    expect(db.ong.updateMany).toHaveBeenCalledWith({ where: { id: ID, logo: LOGO }, data: { logo: null, logoRevisada: null } });
    expect(apagarArquivo).toHaveBeenCalledWith(LOGO);
    expect(db.acaoAdmin.create.mock.calls[0][0].data).toMatchObject({ tipo: "REMOVEU_IMAGEM", motivo: "Logo: Imagem inadequada" });
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({ to: "acesso@casalar.org" });
    expect(vi.mocked(sendEmail).mock.calls[0][0].text).toContain("Imagem inadequada");
  });

  it("remover exige motivo", async () => {
    expect((await patch({ acao: "REMOVER", ongId: ID, tipo: "logo", chave: LOGO })).status).toBe(400);
    expect(db.ong.updateMany).not.toHaveBeenCalled();
  });

  it("falha ao apagar do R2 não desfaz a remoção", async () => {
    vi.mocked(apagarArquivo).mockRejectedValue(new Error("R2 fora"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await patch({ acao: "REMOVER", ongId: ID, tipo: "logo", chave: LOGO, motivo: "Imagem inadequada" })).status).toBe(200);
    expect(db.acaoAdmin.create).toHaveBeenCalled();
  });

  it("404 para ONG que não existe e 400 para ID inválido", async () => {
    db.ong.findUnique.mockResolvedValue(null);
    expect((await patch({ acao: "APROVAR", ongId: ID, tipo: "logo", chave: LOGO })).status).toBe(404);
    expect((await patch({ acao: "APROVAR", ongId: "abc", tipo: "logo", chave: LOGO })).status).toBe(400);
  });
});

describe("imagensParaRevisar", () => {
  it("lista logo e capa não revisadas de perfis publicados, cada uma numa linha", async () => {
    db.ong.findMany.mockResolvedValue([
      ong({ capa: `ongs/${ID}/capa-x.png`, capaRevisada: undefined }),
      ong({ id: "outra", logoRevisada: true, capa: null }),
    ] as never);

    const imagens = await imagensParaRevisar();

    expect(imagens.map((i) => [i.ongId, i.tipo])).toEqual([
      [ID, "logo"],
      [ID, "capa"],
    ]);
    expect(imagens[0]).toMatchObject({ ong: "Casa Lar", pagina: "/ong/casa-lar", chave: LOGO });
    expect(db.ong.findMany.mock.calls[0][0]!.where).toMatchObject({ status: "PUBLICADA" });
  });

  it("conta como não revisada a imagem sem o campo (no MongoDB, { not: true } a deixaria de fora)", async () => {
    db.ong.findMany.mockResolvedValue([] as never);
    await imagensParaRevisar();
    const onde = JSON.stringify(db.ong.findMany.mock.calls[0][0]!.where);
    expect(onde).toContain('{"logoRevisada":{"isSet":false}}');
    expect(onde).toContain('{"capaRevisada":{"isSet":false}}');
    expect(onde).not.toContain('"not":true');
  });
});
