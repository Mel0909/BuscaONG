import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/auth";
import prisma from "@/backend/services/db";
import { resetRateLimit } from "@/utils/api/server/rateLimit";
import { entrarComo } from "../../mocks/auth";
import { POST as enviar } from "@/backend/api/ongs/minha/reinicio/codigo/route";
import { POST as reiniciar } from "@/backend/api/ongs/minha/reinicio/route";
import { publicarOng, salvarContatos } from "@/backend/services/ongs/cadastro";
import { CadastroAlteradoError } from "@/backend/services/ongs/erros";
import { Prisma } from "@/generated/prisma";

vi.mock("@/backend/services/db", () => ({ default: {
  ong: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  user: { delete: vi.fn() },
} }));
const db = vi.mocked(prisma, { deep: true });
const api = auth.api as unknown as { sendVerificationOTP: ReturnType<typeof vi.fn>; signInEmailOTP: ReturnType<typeof vi.fn> };
api.sendVerificationOTP = vi.fn();
api.signInEmailOTP = vi.fn();
const atualizadoEm = new Date("2026-11-01T12:00:00Z");
const ong = { id: "ong-1", userId: "test-user-id", status: "RASCUNHO", updatedAt: atualizadoEm };
const body = { codigo: "123456", confirmar: true };
const request = (corpo: unknown = body, origin: string | null = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/ongs/minha/reinicio", {
  method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(corpo),
});

beforeEach(() => {
  vi.clearAllMocks(); resetRateLimit(); entrarComo("ONG");
  api.sendVerificationOTP.mockReset(); api.signInEmailOTP.mockReset();
  db.ong.findUnique.mockResolvedValue(ong as never);
  db.ong.updateMany.mockResolvedValue({ count: 1 });
  api.sendVerificationOTP.mockResolvedValue({ success: true });
  const headers = new Headers(); headers.append("set-cookie", "sessao=renovada; HttpOnly; SameSite=Lax");
  api.signInEmailOTP.mockResolvedValue({ response: { user: { id: ong.userId }, token: "nao-expor" }, headers });
});

describe("reinício de rascunho", () => {
  it.each([enviar, reiniciar])("exige sessão ONG", async (rota) => {
    entrarComo(null);
    expect((await rota(request())).status).toBe(401);
    entrarComo("ADMIN");
    expect((await rota(request())).status).toBe(403);
    expect(db.ong.updateMany).not.toHaveBeenCalled();
  });

  it.each([null, "https://outro.example"])("recusa origem externa ou ausente: %s", async (origin) => {
    expect((await reiniciar(request(body, origin))).status).toBe(403);
    expect(api.signInEmailOTP).not.toHaveBeenCalled();
  });

  it("envia código só ao e-mail da sessão e não altera o rascunho", async () => {
    expect((await enviar(request({}))).status).toBe(200);
    expect(api.sendVerificationOTP).toHaveBeenCalledWith(expect.objectContaining({ body: { email: "test@example.com", type: "sign-in" } }));
    expect(db.ong.findUnique).toHaveBeenCalledWith({ where: { userId: ong.userId } });
    expect(db.ong.updateMany).not.toHaveBeenCalled();
  });

  it.each([{ ...body, email: "atacante@example.com" }, { ...body, userId: "outro" }, { ...body, cnpj: "12345678000195" }, { codigo: "123456", confirmar: false }])("não aceita alvo ou confirmação adulterados: %j", async (dados) => {
    expect((await reiniciar(request(dados))).status).toBe(400);
    expect(api.signInEmailOTP).not.toHaveBeenCalled();
  });

  it.each(["PUBLICADA", "SUSPENSA"])("não reinicia ONG %s nem envia código", async (status) => {
    db.ong.findUnique.mockResolvedValue({ ...ong, status } as never);
    expect((await enviar(request({}))).status).toBe(409);
    expect((await reiniciar(request())).status).toBe(409);
    expect(api.sendVerificationOTP).not.toHaveBeenCalled();
    expect(api.signInEmailOTP).not.toHaveBeenCalled();
  });

  it("código incorreto, expirado ou reutilizado não limpa dados", async () => {
    api.signInEmailOTP.mockRejectedValue(new APIError("BAD_REQUEST", { message: "INVALID_OTP" }));
    expect((await reiniciar(request())).status).toBe(400);
    expect(db.ong.updateMany).not.toHaveBeenCalled();
  });

  it("a prova deve pertencer à mesma conta da sessão", async () => {
    api.signInEmailOTP.mockResolvedValue({ response: { user: { id: "outro" } }, headers: new Headers() });
    expect((await reiniciar(request())).status).toBe(409);
    expect(db.ong.updateMany).not.toHaveBeenCalled();
  });

  it("confirma a posse, limpa só o rascunho e preserva conta e dados da Receita", async () => {
    const response = await reiniciar(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, passoAtual: 3 });
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(api.signInEmailOTP).toHaveBeenCalledWith(expect.objectContaining({ body: { email: "test@example.com", otp: "123456" } }));
    const { where, data } = db.ong.updateMany.mock.calls[0][0]!;
    expect(where).toEqual({ id: ong.id, userId: ong.userId, status: "RASCUNHO", updatedAt: atualizadoEm });
    expect(data).toMatchObject({ passoAtual: 3, causas: [], itens: [], itensLivres: [], logo: null, capa: null, contatos: { unset: true } });
    expect(data).not.toHaveProperty("cnpj");
    expect(data).not.toHaveProperty("userId");
    expect(data).not.toHaveProperty("enderecoReceita");
    expect(db.user.delete).not.toHaveBeenCalled();
  });

  it("se publicar ou salvar durante a confirmação, recusa o reinício", async () => {
    db.ong.updateMany.mockResolvedValue({ count: 0 });
    expect((await reiniciar(request())).status).toBe(409);
  });

  it("um salvamento iniciado antes do reinício não restaura dados antigos", async () => {
    db.ong.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("conflito", { code: "P2025", clientVersion: "6.19.1" }));
    await expect(salvarContatos(ong.userId, { email: { valor: "ong@example.com", visivel: true }, whatsapp: null, site: null, instagram: null })).rejects.toBeInstanceOf(CadastroAlteradoError);
    expect(db.ong.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: ong.id, userId: ong.userId, status: "RASCUNHO", updatedAt: atualizadoEm } }));
  });

  it("uma publicação iniciada antes do reinício não publica dados antigos", async () => {
    db.ong.findUnique.mockResolvedValue({ ...ong, causas: ["saude"], itens: ["fraldas"], itensLivres: [], localizacao: {}, contatos: { email: { visivel: true } }, nomePublico: "Casa", descricaoCurta: "Acolhimento" } as never);
    db.ong.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("conflito", { code: "P2025", clientVersion: "6.19.1" }));
    await expect(publicarOng(ong.userId)).rejects.toBeInstanceOf(CadastroAlteradoError);
    expect(db.ong.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: ong.id, userId: ong.userId, status: "RASCUNHO", updatedAt: atualizadoEm } }));
  });
});
