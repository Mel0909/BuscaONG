import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/backend/services/db";
import { GET as listar } from "@/backend/api/users/route";
import { GET, PATCH, DELETE } from "@/backend/api/users/[id]/route";

vi.mock("@/backend/services/db", () => ({
  default: {
    user: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    session: { deleteMany: vi.fn() },
    account: { deleteMany: vi.fn() },
  },
}));

const ID = "aB12".repeat(8);
const OUTRO_ID = "cD34".repeat(8);
const usuario = { id: ID, name: "Casa Esperança", email: "ong@example.com", role: "ONG" };
const db = vi.mocked(prisma, { deep: true });
const sessao = vi.mocked(auth.api.getSession);

function entrar(role: "ONG" | "ADMIN" | null = "ONG") {
  sessao.mockResolvedValue({ user: usuario, session: {}, role } as never);
}

function requisicao(method = "GET", id = ID, body?: string) {
  return new NextRequest(`http://localhost:3000/api/users/${id}`, {
    method,
    headers: { cookie: "better-auth.session_token=teste", "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body }),
  });
}

const contexto = (id = ID) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.resetAllMocks();
  entrar();
  db.user.findMany.mockResolvedValue([usuario] as never);
  db.user.findUnique.mockResolvedValue(usuario as never);
  db.user.update.mockResolvedValue(usuario as never);
  db.user.delete.mockResolvedValue(usuario as never);
});

describe("GET /api/users", () => {
  it("exige sessão antes de consultar usuários", async () => {
    sessao.mockResolvedValue(null);
    expect((await listar(requisicao())).status).toBe(401);
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("recusa ONG e não consulta o banco", async () => {
    expect((await listar(requisicao())).status).toBe(403);
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("recusa sessão sem perfil", async () => {
    entrar(null);
    expect((await listar(requisicao())).status).toBe(403);
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it("permite apenas admin e usa os cookies da requisição", async () => {
    entrar("ADMIN");
    const request = requisicao();
    const response = await listar(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([usuario]);
    expect(sessao).toHaveBeenCalledWith({ headers: request.headers });
  });
});

describe.each([
  { metodo: "GET", executar: GET, corpo: undefined },
  { metodo: "PATCH", executar: PATCH, corpo: JSON.stringify({ name: "Casa Esperança" }) },
  { metodo: "DELETE", executar: DELETE, corpo: undefined },
])("$metodo /api/users/[id]", ({ metodo, executar, corpo }) => {
  function chamar(id = ID) {
    return executar(requisicao(metodo, id, corpo), contexto(id));
  }

  function semAcessoAoBanco() {
    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.user.delete).not.toHaveBeenCalled();
    expect(db.session.deleteMany).not.toHaveBeenCalled();
    expect(db.account.deleteMany).not.toHaveBeenCalled();
  }

  it("exige login, inclusive com ID malformado", async () => {
    sessao.mockResolvedValue(null);
    expect((await chamar("invalido")).status).toBe(401);
    semAcessoAoBanco();
  });

  it("recusa sessão sem perfil", async () => {
    entrar(null);
    expect((await chamar()).status).toBe(403);
    semAcessoAoBanco();
  });

  it("recusa acesso de uma ONG à conta de outra", async () => {
    expect((await chamar(OUTRO_ID)).status).toBe(403);
    semAcessoAoBanco();
  });

  it("permite acesso à própria conta com ID do better-auth", async () => {
    expect((await chamar()).status).toBe(200);
    if (metodo === "GET") expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: ID } });
    if (metodo === "PATCH") expect(db.user.update).toHaveBeenCalledWith({ where: { id: ID }, data: { name: "Casa Esperança" } });
    if (metodo === "DELETE") expect(db.user.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it("permite ao admin acessar outra conta", async () => {
    entrar("ADMIN");
    expect((await chamar(OUTRO_ID)).status).toBe(200);
  });

  it.each(["curto", "a".repeat(31), "a".repeat(33), "a".repeat(31) + "!", "6ae649983bbad49560772d32", "550e8400-e29b-41d4-a716-446655440000"])("recusa ID inválido: %s", async (id) => {
    entrar("ADMIN");
    expect((await chamar(id)).status).toBe(400);
    semAcessoAoBanco();
  });
});

describe("respostas e validação de usuários", () => {
  it("retorna 404 para usuário inexistente depois de autorizar", async () => {
    entrar("ADMIN");
    db.user.findUnique.mockResolvedValue(null);
    const response = await GET(requisicao(), contexto());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { message: "Usuário não encontrado" } });
  });

  it("retorna 400 para JSON malformado sem atualizar", async () => {
    const response = await PATCH(requisicao("PATCH", ID, "{"), contexto());
    expect(response.status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it.each(["role", "email", "password"])("não permite alterar %s pelo PATCH comum", async (campo) => {
    const response = await PATCH(requisicao("PATCH", ID, JSON.stringify({ [campo]: "ADMIN" })), contexto());
    expect(response.status).toBe(400);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("não expõe detalhes de falhas internas", async () => {
    db.user.findUnique.mockRejectedValue(new Error("detalhe interno do banco"));
    const response = await GET(requisicao(), contexto());
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("detalhe interno");
  });
});
