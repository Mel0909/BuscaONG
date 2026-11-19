import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/backend/services/db";

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn() },
    denuncia: { groupBy: vi.fn() },
  },
}));

import { fichaOngAdmin, listarOngsAdmin } from "@/backend/services/admin";

const db = vi.mocked(prisma, { deep: true });

const ong = (extra: Record<string, unknown> = {}) => ({
  id: "6ae649983bbad49560772d32",
  nomePublico: "Casa Lar",
  razaoSocial: "ASSOCIACAO CASA LAR",
  cnpj: "12345678000195",
  status: "PUBLICADA",
  situacaoCadastral: "ATIVA",
  naturezaJuridica: "3999",
  endereco: { municipio: "São Paulo", uf: "SP" },
  enderecoReceita: { municipio: "SAO PAULO", uf: "SP" },
  usarEnderecoReceita: true,
  urgencias: [],
  contatos: null,
  receitaConsultadaEm: new Date("2026-10-01"),
  createdAt: new Date("2026-09-30"),
  publicadaEm: new Date("2026-10-01"),
  suspensao: null,
  slug: "casa-lar",
  user: { email: "acesso@casalar.org" },
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  db.denuncia.groupBy.mockResolvedValue([] as never);
});

describe("CNPJ com problema (A1)", () => {
  it("o filtro pega situação não ativa e natureza que não pode se cadastrar", async () => {
    db.ong.findMany.mockResolvedValue([] as never);
    await listarOngsAdmin("cnpj", "");
    const onde = JSON.stringify(db.ong.findMany.mock.calls[0][0]!.where);
    expect(onde).toContain('"situacaoCadastral":{"not":"ATIVA"}');
    expect(onde).toContain('"naturezaJuridica":{"startsWith":"3"}');
    expect(onde).toContain('"3131"');
  });

  it("marca para revisar a ONG com natureza recusada", async () => {
    db.ong.findMany.mockResolvedValue([ong({ naturezaJuridica: "3131" }), ong({ id: "outra" })] as never);
    const linhas = await listarOngsAdmin("todas", "");
    expect(linhas.map((l) => l.revisar)).toEqual([true, false]);
  });

  it("a ficha mostra o sinal e o problema na natureza", async () => {
    db.ong.findUnique.mockResolvedValue(ong({ naturezaJuridica: "3131" }) as never);
    const ficha = await fichaOngAdmin("6ae649983bbad49560772d32");
    expect(ficha?.sinais).toContain("Natureza jurídica de entidade sindical, que não é ONG");
    expect(ficha?.comparacao.find((c) => c.campo === "Natureza")?.problema).toBe(true);
    expect(ficha?.comparacao.find((c) => c.campo === "Situação")?.problema).toBe(false);
  });
});
