import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/backend/services/db";
import { geocodificar } from "@/lib/geocodificacao";
import { resetRateLimit } from "@/utils/api/server";
import { setCurrentRole } from "../../mocks/auth";

vi.mock("@/lib/geocodificacao", () => ({ geocodificar: vi.fn() }));
vi.mock("@/backend/services/db", () => ({ default: { ong: { aggregateRaw: vi.fn() } } }));

import { GET as getGeocodificacao } from "@/backend/api/geocodificacao/route";
import { GET as getItensLivres } from "@/backend/api/itens-livres/route";

const geocodificarMock = vi.mocked(geocodificar);
const db = vi.mocked(prisma, { deep: true });

const get = (caminho: string) => new NextRequest(`http://localhost:3000/api/${caminho}`);

describe("GET /api/geocodificacao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    setCurrentRole("ONG");
  });

  it("devolve o ponto do endereço", async () => {
    geocodificarMock.mockResolvedValue({ latitude: -23.58, longitude: -46.63, precisao: "endereco" });

    const response = await getGeocodificacao(get("geocodificacao?logradouro=Rua%20A&municipio=S%C3%A3o%20Paulo&uf=sp"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ latitude: -23.58, longitude: -46.63, precisao: "endereco" });
    expect(geocodificarMock).toHaveBeenCalledWith(expect.objectContaining({ municipio: "São Paulo", uf: "SP" }));
  });

  it("exige login de ONG (o serviço externo tem limite)", async () => {
    setCurrentRole(null);
    expect((await getGeocodificacao(get("geocodificacao?municipio=Recife&uf=PE"))).status).toBe(401);
    expect(geocodificarMock).not.toHaveBeenCalled();
  });

  it("400 sem cidade, 404 sem resultado e 503 se o serviço falhar", async () => {
    expect((await getGeocodificacao(get("geocodificacao?uf=PE"))).status).toBe(400);

    geocodificarMock.mockResolvedValue(null);
    expect((await getGeocodificacao(get("geocodificacao?municipio=Recife&uf=PE"))).status).toBe(404);

    geocodificarMock.mockRejectedValue(new Error("timeout"));
    expect((await getGeocodificacao(get("geocodificacao?municipio=Olinda&uf=PE"))).status).toBe(503);
  });

  it("limita a 10 consultas por minuto por conta", async () => {
    geocodificarMock.mockResolvedValue(null);
    for (let i = 0; i < 10; i++) await getGeocodificacao(get("geocodificacao?municipio=Recife&uf=PE"));
    expect((await getGeocodificacao(get("geocodificacao?municipio=Recife&uf=PE"))).status).toBe(429);
  });
});

describe("GET /api/itens-livres", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    setCurrentRole("ONG");
  });

  it("sugere itens de outras ONGs pelo começo do nome normalizado", async () => {
    db.ong.aggregateRaw.mockResolvedValue([{ nome: "Ventilador", chave: "ventilador", ongs: 4 }] as never);

    const response = await getItensLivres(get("itens-livres?q=Ventíl"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ nome: "Ventilador", chave: "ventilador", ongs: 4 }]);
    const { pipeline } = db.ong.aggregateRaw.mock.calls[0][0] as { pipeline: Record<string, unknown>[] };
    expect(pipeline[0]).toEqual({
      $match: { userId: { $ne: "test-user-id" }, status: "PUBLICADA", "itensLivres.chave": { $regex: "^ventil" } },
    });
  });

  it("escapa caracteres especiais de regex", async () => {
    db.ong.aggregateRaw.mockResolvedValue([] as never);
    await getItensLivres(get("itens-livres?q=a.b*"));
    const { pipeline } = db.ong.aggregateRaw.mock.calls[0][0] as { pipeline: { $match: Record<string, unknown> }[] };
    expect(pipeline[0].$match["itensLivres.chave"]).toEqual({ $regex: "^a\\.b\\*" });
  });

  it("não sugere texto de rascunhos nem de ONGs suspensas (só de perfis publicados)", async () => {
    db.ong.aggregateRaw.mockResolvedValue([] as never);
    await getItensLivres(get("itens-livres?q=ventil"));
    const { pipeline } = db.ong.aggregateRaw.mock.calls[0][0] as { pipeline: { $match: Record<string, unknown> }[] };
    expect(pipeline[0].$match.status).toBe("PUBLICADA");
  });

  it("400 com menos de 3 letras", async () => {
    expect((await getItensLivres(get("itens-livres?q=ve"))).status).toBe(400);
  });

  it("limita as consultas por conta (60 por minuto)", async () => {
    db.ong.aggregateRaw.mockResolvedValue([] as never);
    for (let i = 0; i < 60; i++) expect((await getItensLivres(get("itens-livres?q=ventil"))).status).toBe(200);
    expect((await getItensLivres(get("itens-livres?q=ventil"))).status).toBe(429);
  });
});
