import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/backend/services/db";
import { Prisma } from "@/generated/prisma";
import { CnpjLookupUnavailableError, CnpjNotFoundError, lookupCnpj } from "@/lib/cnpj";
import { resetRateLimit } from "@/utils/api/server";
import { createRequest } from "../../mocks/requests";
import { cnpjDataMock } from "../../mocks/cnpj";

vi.mock("@/lib/cnpj", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cnpj")>()),
  lookupCnpj: vi.fn(),
}));

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { findUnique: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

import { POST } from "@/backend/api/ongs/route";

const lookupMock = vi.mocked(lookupCnpj);
const db = vi.mocked(prisma, { deep: true });
const signUpEmail = vi.fn();
(auth.api as unknown as { signUpEmail: typeof signUpEmail }).signUpEmail = signUpEmail;

const CNPJ = "12345678000195";
const USER_ID = "user-1";
const corpo = {
  cnpj: "12.345.678/0001-95",
  email: "Contato@CasaLar.org.br",
  password: "Senha123",
  usarEnderecoReceita: true,
};

const post = (body: unknown = corpo) => POST(createRequest(body, "ongs"));

describe("POST /api/ongs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();

    db.ong.findUnique.mockResolvedValue(null);
    lookupMock.mockResolvedValue(cnpjDataMock());
    // e-mail livre antes do cadastro; usuário existe depois
    db.user.findUnique.mockImplementation((async (args: { where: { id?: string } }) =>
      args.where.id === USER_ID ? { id: USER_ID } : null) as never);
    signUpEmail.mockResolvedValue({ token: null, user: { id: USER_ID } });
    db.ong.create.mockResolvedValue({
      id: "ong-1",
      cnpj: CNPJ,
      razaoSocial: "ASSOCIACAO CASA LAR ESPERANCA",
      status: "RASCUNHO",
      passoAtual: 3,
    } as never);
    db.user.delete.mockResolvedValue({} as never);
  });

  it("cria o usuário e a ONG em rascunho", async () => {
    const response = await post();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.email).toBe("contato@casalar.org.br");
    expect(body.ong).toMatchObject({ cnpj: CNPJ, status: "RASCUNHO", passoAtual: 3 });

    expect(signUpEmail).toHaveBeenCalledWith({
      body: {
        name: "ASSOCIACAO CASA LAR ESPERANCA",
        email: "contato@casalar.org.br",
        password: "Senha123",
      },
    });
    expect(db.ong.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cnpj: CNPJ,
          naturezaJuridica: "3999",
          situacaoCadastral: "ATIVA",
          usarEnderecoReceita: true,
          userId: USER_ID,
        }),
      })
    );
  });

  it("revalida o CNPJ na Receita no servidor", async () => {
    await post();
    expect(lookupMock).toHaveBeenCalledWith(CNPJ);
  });

  it.each([
    ["senha fraca", { ...corpo, password: "senha" }],
    ["e-mail inválido", { ...corpo, email: "nao-e-email" }],
    ["CNPJ inválido", { ...corpo, cnpj: "12345678000196" }],
    ["campo extra (role)", { ...corpo, role: "ADMIN" }],
  ])("devolve 400 para %s sem criar nada", async (_, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(signUpEmail).not.toHaveBeenCalled();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("devolve 400 para JSON malformado", async () => {
    const request = new NextRequest("http://localhost:3000/api/ongs", {
      method: "POST",
      body: "{ não é json",
      headers: { "Content-Type": "application/json" },
    });

    expect((await POST(request)).status).toBe(400);
  });

  it("devolve 409 quando o CNPJ já tem conta, sem consultar a Receita", async () => {
    db.ong.findUnique.mockResolvedValue({ id: "ong-1" } as never);

    const response = await post();

    expect(response.status).toBe(409);
    expect((await response.json()).error.details).toEqual({ campo: "cnpj" });
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("devolve 422 quando o CNPJ não é elegível", async () => {
    lookupMock.mockResolvedValue(cnpjDataMock({ situacaoCadastral: "BAIXADA" }));

    const response = await post();

    expect(response.status).toBe(422);
    expect((await response.json()).error.details).toEqual({ motivo: "SITUACAO_NAO_ATIVA" });
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("devolve 409 quando o e-mail já tem conta", async () => {
    db.user.findUnique.mockResolvedValue({ id: "outro" } as never);

    const response = await post();

    expect(response.status).toBe(409);
    expect((await response.json()).error.details).toEqual({ campo: "email" });
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  it("não cria a ONG quando o better-auth devolve um usuário falso (e-mail repetido)", async () => {
    db.user.findUnique.mockResolvedValue(null);
    signUpEmail.mockResolvedValue({ token: null, user: { id: "id-falso" } });

    const response = await post();

    expect(response.status).toBe(409);
    expect(db.ong.create).not.toHaveBeenCalled();
  });

  it("apaga o usuário quando outro cadastro pega o CNPJ ao mesmo tempo", async () => {
    db.ong.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "6",
      })
    );

    const response = await post();

    expect(response.status).toBe(409);
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });

  it("apaga o usuário quando a criação da ONG falha por outro motivo", async () => {
    db.ong.create.mockRejectedValue(new Error("banco fora do ar"));

    const response = await post();

    expect(response.status).toBe(500);
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });

  it("devolve 404 quando o CNPJ não existe na Receita", async () => {
    lookupMock.mockRejectedValue(new CnpjNotFoundError(CNPJ));
    expect((await post()).status).toBe(404);
  });

  it("devolve 503 quando a Receita não responde", async () => {
    lookupMock.mockRejectedValue(new CnpjLookupUnavailableError());
    expect((await post()).status).toBe(503);
  });

  it("devolve 429 depois de 5 tentativas por minuto", async () => {
    for (let i = 0; i < 5; i++) await post();
    expect((await post()).status).toBe(429);
  });
});
