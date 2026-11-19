import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/backend/services/db";
import { CnpjLookupUnavailableError, CnpjNotFoundError, lookupCnpj } from "@/lib/cnpj";
import { cnpjDataMock } from "../../mocks/cnpj";

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { findMany: vi.fn(), update: vi.fn() },
    acaoAdmin: { create: vi.fn() },
  },
}));
vi.mock("@/lib/cnpj", async (original) => ({ ...(await original<object>()), lookupCnpj: vi.fn() }));

import { GET } from "@/backend/api/cron/revalidacao-cnpj/route";
import { INTERVALO_REVALIDACAO_DIAS, revalidarCnpjsAntigos } from "@/backend/services/admin";

const db = vi.mocked(prisma, { deep: true });
const SEGREDO = "segredo-de-teste-com-32-caracteres!";
const agora = new Date("2026-11-19T09:00:00Z");
const semEspera = () => Promise.resolve();

const ong = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  cnpj: "12345678000195",
  nomePublico: `ONG ${id}`,
  razaoSocial: "ASSOCIACAO",
  situacaoCadastral: "ATIVA",
  naturezaJuridica: "3999",
  ...extra,
});

const chamar = (authorization?: string) =>
  GET(new NextRequest("http://localhost:3000/api/cron/revalidacao-cnpj", { headers: authorization ? { authorization } : {} }));

beforeEach(() => {
  vi.clearAllMocks();
  db.ong.findMany.mockResolvedValue([] as never);
  db.ong.update.mockResolvedValue({} as never);
  vi.mocked(lookupCnpj).mockResolvedValue(cnpjDataMock());
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/revalidacao-cnpj", () => {
  it("sem CRON_SECRET configurado recusa tudo (503), sem consultar nada", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await chamar(`Bearer ${SEGREDO}`)).status).toBe(503);
    expect(db.ong.findMany).not.toHaveBeenCalled();
  });

  it.each([undefined, "Bearer errado", SEGREDO, `bearer ${SEGREDO}`, `Bearer ${SEGREDO}x`])(
    "401 com o header %s",
    async (header) => {
      vi.stubEnv("CRON_SECRET", SEGREDO);
      expect((await chamar(header)).status).toBe(401);
      expect(db.ong.findMany).not.toHaveBeenCalled();
    }
  );

  it("com o segredo certo, roda e devolve o resumo", async () => {
    vi.stubEnv("CRON_SECRET", SEGREDO);
    const response = await chamar(`Bearer ${SEGREDO}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ consultadas: 0, mudaram: 0, naoEncontradas: 0, interrompida: false });
  });
});

describe("revalidarCnpjsAntigos", () => {
  it("pega as ONGs fora de rascunho com a consulta mais antiga, além do intervalo", async () => {
    await revalidarCnpjsAntigos({ agora, esperar: semEspera });
    const args = db.ong.findMany.mock.calls[0][0]!;
    expect(args.where).toEqual({
      status: { not: "RASCUNHO" },
      receitaConsultadaEm: { lt: new Date(agora.getTime() - INTERVALO_REVALIDACAO_DIAS * 86_400_000) },
    });
    expect(args.orderBy).toEqual({ receitaConsultadaEm: "asc" });
    expect(args.take).toBe(10);
  });

  it("grava o que a Receita diz e só registra (como sistema) o que mudou", async () => {
    db.ong.findMany.mockResolvedValue([ong("a"), ong("b")] as never);
    vi.mocked(lookupCnpj)
      .mockResolvedValueOnce(cnpjDataMock())
      .mockResolvedValueOnce(cnpjDataMock({ situacaoCadastral: "BAIXADA" }));

    const resultado = await revalidarCnpjsAntigos({ agora, esperar: semEspera });

    expect(resultado).toEqual({ consultadas: 2, mudaram: 1, naoEncontradas: 0, interrompida: false });
    expect(db.ong.update).toHaveBeenCalledTimes(2);
    expect(db.ong.update.mock.calls[1][0].data).toMatchObject({ situacaoCadastral: "BAIXADA", receitaConsultadaEm: agora });
    expect(db.acaoAdmin.create).toHaveBeenCalledTimes(1);
    expect(db.acaoAdmin.create.mock.calls[0][0].data).toMatchObject({
      tipo: "REVALIDOU_CNPJ",
      alvo: "ONG b",
      adminId: null,
      adminEmail: null,
      motivo: "Situação mudou: Ativa → Baixada",
    });
  });

  it("espera entre uma consulta e outra", async () => {
    db.ong.findMany.mockResolvedValue([ong("a"), ong("b"), ong("c")] as never);
    const esperar = vi.fn(semEspera);
    await revalidarCnpjsAntigos({ agora, esperar });
    expect(esperar).toHaveBeenCalledTimes(2);
  });

  it("CNPJ não encontrado: registra e adia, sem mexer na situação", async () => {
    db.ong.findMany.mockResolvedValue([ong("a")] as never);
    vi.mocked(lookupCnpj).mockRejectedValue(new CnpjNotFoundError("12345678000195"));

    const resultado = await revalidarCnpjsAntigos({ agora, esperar: semEspera });

    expect(resultado).toMatchObject({ consultadas: 1, naoEncontradas: 1 });
    expect(db.ong.update.mock.calls[0][0].data).toEqual({ receitaConsultadaEm: agora });
    expect(db.acaoAdmin.create.mock.calls[0][0].data).toMatchObject({ motivo: "CNPJ não encontrado na Receita", adminId: null });
  });

  it("Receita fora do ar: para a rodada e deixa o resto para a próxima", async () => {
    db.ong.findMany.mockResolvedValue([ong("a"), ong("b")] as never);
    vi.mocked(lookupCnpj).mockRejectedValue(new CnpjLookupUnavailableError());

    const resultado = await revalidarCnpjsAntigos({ agora, esperar: semEspera });

    expect(resultado).toEqual({ consultadas: 0, mudaram: 0, naoEncontradas: 0, interrompida: true });
    expect(lookupCnpj).toHaveBeenCalledTimes(1);
    expect(db.ong.update).not.toHaveBeenCalled();
  });
});
