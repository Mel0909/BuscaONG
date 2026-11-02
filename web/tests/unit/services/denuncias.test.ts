import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/backend/services/db";

vi.mock("@/backend/services/db", () => ({
  default: { denuncia: { findMany: vi.fn() } },
}));

import { filaDeDenuncias } from "@/backend/services/denuncias";

const db = vi.mocked(prisma, { deep: true });
const agora = new Date("2026-11-02T12:00:00Z");
const horasAtras = (h: number) => new Date(agora.getTime() - h * 3_600_000);
const denuncia = (ongId: string, motivo: string, horas: number) => ({
  ongId,
  motivo,
  createdAt: horasAtras(horas),
  ong: { nomePublico: `ONG ${ongId}`, razaoSocial: "X" },
});

describe("fila de denúncias (A2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("agrupa por ONG e motivo e põe no topo violência e 3+ em 7 dias", async () => {
    // a consulta já vem das mais recentes para as mais antigas
    db.denuncia.findMany.mockResolvedValue([
      denuncia("a", "OUTRO", 1),
      denuncia("b", "FECHOU", 2),
      denuncia("c", "VIOLENCIA", 300),
      denuncia("b", "FECHOU", 30),
      denuncia("b", "FECHOU", 100),
      denuncia("a", "FECHOU", 200),
      denuncia("d", "FECHOU", 10),
      denuncia("d", "FECHOU", 20),
      denuncia("d", "FECHOU", 24 * 9), // fora dos 7 dias: d fica com 2 recentes
    ] as never);

    const fila = await filaDeDenuncias("ABERTA", agora);

    expect(fila.map((g) => [g.ongId, g.motivo, g.total, g.prioritaria])).toEqual([
      ["b", "FECHOU", 3, true],
      ["c", "VIOLENCIA", 1, true],
      ["a", "OUTRO", 1, false],
      ["d", "FECHOU", 3, false],
      ["a", "FECHOU", 1, false],
    ]);
    expect(fila[0].ultima).toEqual(horasAtras(2));
    expect(db.denuncia.findMany.mock.calls[0][0]).toMatchObject({ where: { status: "ABERTA" }, orderBy: { createdAt: "desc" } });
  });
});
