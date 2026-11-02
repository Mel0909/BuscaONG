import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/backend/services/db";
import { sendEmail } from "@/lib/email";
import { lookupCnpj } from "@/lib/cnpj";
import { setCurrentRole } from "../../mocks/auth";

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { findUnique: vi.fn(), update: vi.fn() },
    user: { delete: vi.fn() },
    denuncia: { findMany: vi.fn(), updateMany: vi.fn(), groupBy: vi.fn() },
    acaoAdmin: { create: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/cnpj", async (original) => ({ ...(await original<object>()), lookupCnpj: vi.fn() }));

import { DELETE as excluir, PATCH as alterarStatus } from "@/backend/api/admin/ongs/[id]/route";
import { POST as revalidar } from "@/backend/api/admin/ongs/[id]/revalidacao/route";
import { PATCH as arquivar } from "@/backend/api/admin/denuncias/route";
import { GET as exportar } from "@/backend/api/admin/acoes/route";

const db = vi.mocked(prisma, { deep: true });
const ID = "6ae649983bbad49560772d32";

const ong = (extra: Record<string, unknown> = {}) => ({
  id: ID,
  userId: "user-ong",
  cnpj: "12345678000195",
  razaoSocial: "ASSOCIACAO CASA LAR",
  nomePublico: "Casa Lar",
  naturezaJuridica: "3999",
  situacaoCadastral: "ATIVA",
  status: "PUBLICADA",
  publicadaEm: new Date("2026-10-01"),
  slug: "casa-lar",
  contatos: null,
  endereco: { municipio: "São Paulo", uf: "SP" },
  enderecoReceita: { municipio: "SAO PAULO", uf: "SP" },
  usarEnderecoReceita: true,
  receitaConsultadaEm: new Date("2026-10-01"),
  createdAt: new Date("2026-09-30"),
  suspensao: null,
  user: { email: "acesso@casalar.org" },
  ...extra,
});

const requisicao = (metodo: string, caminho: string, body?: unknown) =>
  new NextRequest(`http://localhost:3000/api/admin/${caminho}`, {
    method: metodo,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
const contexto = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });

describe("rotas do admin: ONGs e denúncias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentRole("ADMIN");
    db.ong.findUnique.mockResolvedValue(ong() as never);
    db.ong.update.mockResolvedValue({} as never);
    db.denuncia.findMany.mockResolvedValue([] as never);
    db.denuncia.updateMany.mockResolvedValue({ count: 0 } as never);
    db.denuncia.groupBy.mockResolvedValue([] as never);
    vi.mocked(sendEmail).mockResolvedValue(undefined);
  });

  describe("acesso", () => {
    it("401 sem login e 403 para conta de ONG", async () => {
      setCurrentRole(null);
      expect((await alterarStatus(requisicao("PATCH", `ongs/${ID}`, { status: "SUSPENSA", motivo: "Teste" }), contexto({ id: ID }))).status).toBe(401);
      setCurrentRole("ONG");
      expect((await alterarStatus(requisicao("PATCH", `ongs/${ID}`, { status: "SUSPENSA", motivo: "Teste" }), contexto({ id: ID }))).status).toBe(403);
      expect(db.ong.update).not.toHaveBeenCalled();
    });

    it("400 para ID que não é do MongoDB", async () => {
      const response = await alterarStatus(requisicao("PATCH", "ongs/abc", { status: "SUSPENSA", motivo: "Teste" }), contexto({ id: "abc" }));
      expect(response.status).toBe(400);
    });
  });

  describe("suspender e reativar", () => {
    it("suspende com motivo, resolve as denúncias abertas, avisa a ONG e registra", async () => {
      db.denuncia.findMany.mockResolvedValue([{ id: "d1", email: "quem@denunciou.com" }, { id: "d2", email: null }] as never);

      const response = await alterarStatus(
        requisicao("PATCH", `ongs/${ID}`, { status: "SUSPENSA", motivo: "ONG encerrada" }),
        contexto({ id: ID })
      );

      expect(response.status).toBe(200);
      expect(db.ong.update.mock.calls[0][0].data).toMatchObject({
        status: "SUSPENSA",
        suspensao: { motivo: "ONG encerrada", adminEmail: "test@example.com" },
      });
      // resolve só as que leu (uma que chegar no meio continua aberta)
      expect(db.denuncia.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: { in: ["d1", "d2"] }, status: "ABERTA" },
        data: { status: "COM_ACAO" },
      });
      expect(db.acaoAdmin.create.mock.calls[0][0].data).toMatchObject({
        tipo: "SUSPENDEU_ONG",
        alvo: "Casa Lar",
        motivo: "ONG encerrada · 2 denúncias",
        adminEmail: "test@example.com",
      });
      const destinatarios = vi.mocked(sendEmail).mock.calls.map(([email]) => email.to);
      expect(destinatarios).toEqual(["acesso@casalar.org", "quem@denunciou.com"]);
    });

    it("falha no e-mail não desfaz a suspensão", async () => {
      vi.mocked(sendEmail).mockRejectedValue(new Error("Resend fora"));
      const response = await alterarStatus(requisicao("PATCH", `ongs/${ID}`, { status: "SUSPENSA", motivo: "Teste" }), contexto({ id: ID }));
      expect(response.status).toBe(200);
      expect(db.acaoAdmin.create).toHaveBeenCalled();
    });

    it("400 sem motivo", async () => {
      const response = await alterarStatus(requisicao("PATCH", `ongs/${ID}`, { status: "SUSPENSA", motivo: " " }), contexto({ id: ID }));
      expect(response.status).toBe(400);
    });

    it("reativa só ONG suspensa (409 para as outras)", async () => {
      expect((await alterarStatus(requisicao("PATCH", `ongs/${ID}`, { status: "PUBLICADA", motivo: "Engano" }), contexto({ id: ID }))).status).toBe(409);

      db.ong.findUnique.mockResolvedValue(ong({ status: "SUSPENSA" }) as never);
      const response = await alterarStatus(requisicao("PATCH", `ongs/${ID}`, { status: "PUBLICADA", motivo: "CNPJ regularizado" }), contexto({ id: ID }));
      expect(response.status).toBe(200);
      expect(db.ong.update.mock.calls[0][0].data).toEqual({ status: "PUBLICADA", suspensao: null });
      expect(db.acaoAdmin.create.mock.calls[0][0].data).toMatchObject({ tipo: "REATIVOU_ONG", motivo: "CNPJ regularizado" });
    });

    it("404 para ONG que não existe", async () => {
      db.ong.findUnique.mockResolvedValue(null as never);
      const response = await alterarStatus(requisicao("PATCH", `ongs/${ID}`, { status: "SUSPENSA", motivo: "Teste" }), contexto({ id: ID }));
      expect(response.status).toBe(404);
    });
  });

  it("excluir apaga a conta (a ONG cai junto) e registra com o CNPJ", async () => {
    const response = await excluir(requisicao("DELETE", `ongs/${ID}`, { motivo: "Cadastro fraudulento" }), contexto({ id: ID }));

    expect(response.status).toBe(200);
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "user-ong" } });
    expect(db.acaoAdmin.create.mock.calls[0][0].data).toMatchObject({
      tipo: "EXCLUIU_ONG",
      alvo: "Casa Lar",
      motivo: "Cadastro fraudulento · CNPJ 12.345.678/0001-95",
    });
  });

  it("revalidar consulta a Receita e guarda a situação atual", async () => {
    vi.mocked(lookupCnpj).mockResolvedValue({
      cnpj: "12345678000195",
      razaoSocial: "ASSOCIACAO CASA LAR",
      nomeFantasia: null,
      situacaoCadastral: "BAIXADA",
      naturezaJuridica: { codigo: "3999", descricao: "Associação Privada" },
      endereco: { tipoLogradouro: null, logradouro: null, numero: null, complemento: null, bairro: null, municipio: "GUARULHOS", uf: "SP", cep: null },
      fonte: "brasilapi",
    });

    const response = await revalidar(requisicao("POST", `ongs/${ID}/revalidacao`), contexto({ id: ID }));

    expect(response.status).toBe(200);
    expect(db.ong.update.mock.calls[0][0].data).toMatchObject({ situacaoCadastral: "BAIXADA", enderecoReceita: { municipio: "GUARULHOS" } });
    expect(db.acaoAdmin.create.mock.calls[0][0].data).toMatchObject({ tipo: "REVALIDOU_CNPJ", motivo: "Situação mudou: Ativa → Baixada" });
  });

  describe("PATCH /api/admin/denuncias", () => {
    it("arquiva as denúncias abertas do motivo, avisa quem deixou e-mail e registra", async () => {
      db.denuncia.findMany.mockResolvedValue([{ id: "d1", email: "a@b.com" }, { id: "d2", email: "a@b.com" }, { id: "d3", email: null }] as never);

      const response = await arquivar(
        requisicao("PATCH", "denuncias", { ongId: ID, motivo: "FECHOU", justificativa: "Sem procedência" }),
        contexto()
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ arquivadas: 3 });
      expect(db.denuncia.findMany.mock.calls[0][0]?.where).toEqual({ ongId: ID, status: "ABERTA", motivo: "FECHOU" });
      expect(db.denuncia.updateMany.mock.calls[0][0]).toMatchObject({
        where: { id: { in: ["d1", "d2", "d3"] } },
        data: { status: "ARQUIVADA", resolucao: "Sem procedência" },
      });
      expect(db.acaoAdmin.create.mock.calls[0][0].data).toMatchObject({
        tipo: "ARQUIVOU_DENUNCIA",
        motivo: "Sem procedência · 3 denúncias “ONG fechou ou mudou”",
      });
      expect(vi.mocked(sendEmail)).toHaveBeenCalledTimes(1);
      expect(db.ong.update).not.toHaveBeenCalled();
    });

    it("sem denúncias abertas, não registra nada", async () => {
      const response = await arquivar(requisicao("PATCH", "denuncias", { ongId: ID, motivo: "FECHOU", justificativa: "Sem procedência" }), contexto());
      expect(await response.json()).toEqual({ arquivadas: 0 });
      expect(db.acaoAdmin.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/admin/acoes (CSV)", () => {
    it("exporta o filtro em CSV, com 'sistema' para ações automáticas", async () => {
      db.acaoAdmin.findMany.mockResolvedValue([
        { tipo: "SUSPENDEU_ONG", adminEmail: "ana@buscaong.org", alvo: "Abrigo, Novo", motivo: 'Disse "fechou"', createdAt: new Date("2026-10-02T17:20:00Z") },
        { tipo: "REVALIDOU_CNPJ", adminEmail: null, alvo: "327 ONGs", motivo: null, createdAt: new Date("2026-09-30T12:00:00Z") },
        { tipo: "EXCLUIU_ONG", adminEmail: "ana@buscaong.org", alvo: '=HYPERLINK("http://x")', motivo: "-1+2", createdAt: new Date("2026-09-30T12:00:00Z") },
      ] as never);

      const response = await exportar(new NextRequest("http://localhost:3000/api/admin/acoes?categoria=suspensoes&q=abrigo"));
      const texto = await response.text();

      expect(response.headers.get("Content-Type")).toContain("text/csv");
      expect(db.acaoAdmin.findMany.mock.calls[0][0]?.where).toMatchObject({
        AND: [{ tipo: { in: ["SUSPENDEU_ONG", "REATIVOU_ONG"] } }, { OR: expect.any(Array) }],
      });
      const linhas = texto.replace(/^﻿/, "").split("\n");
      expect(linhas[0]).toBe("quando,quem,acao,alvo,motivo");
      // horário de Brasília; células com vírgula ou aspas vão entre aspas
      expect(linhas[1]).toBe('"02/10/2026, 14:20:00",ana@buscaong.org,Suspendeu ONG,"Abrigo, Novo","Disse ""fechou"""');
      expect(linhas[2]).toContain(",sistema,Revalidou CNPJ,327 ONGs,");
      // nome que começa com = ou - não vira fórmula no Excel
      expect(linhas[3]).toContain(',Excluiu ONG,"\'=HYPERLINK(""http://x"")",\'-1+2');
    });

    it("403 para conta de ONG", async () => {
      setCurrentRole("ONG");
      expect((await exportar(new NextRequest("http://localhost:3000/api/admin/acoes"))).status).toBe(403);
    });
  });
});
