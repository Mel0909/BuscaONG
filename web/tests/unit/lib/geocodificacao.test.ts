import { beforeEach, describe, expect, it, vi } from "vitest";
import { geocodificar, limparCacheGeocodificacao } from "@/lib/geocodificacao";

const resposta = (lista: unknown, status = 200) =>
  new Response(JSON.stringify(lista), { status, headers: { "Content-Type": "application/json" } });

const endereco = {
  logradouro: "Rua Domingos de Morais",
  numero: "1200",
  bairro: "Vila Mariana",
  municipio: "São Paulo",
  uf: "SP",
};

describe("geocodificar", () => {
  beforeEach(() => limparCacheGeocodificacao());

  it("acha a rua com número e identifica o app no User-Agent", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta([{ lat: "-23.5893", lon: "-46.6345" }]));

    const ponto = await geocodificar(endereco, { fetchImpl });

    expect(ponto).toEqual({ latitude: -23.5893, longitude: -46.6345, precisao: "endereco" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url.searchParams.get("street")).toBe("1200 Rua Domingos de Morais");
    expect(url.searchParams.get("countrycodes")).toBe("br");
    expect(init.headers["User-Agent"]).toMatch(/BuscaONG/);
  });

  it("cai para o município quando não acha a rua", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(resposta([]))
      .mockResolvedValueOnce(resposta([{ lat: "-23.55", lon: "-46.63" }]));

    const ponto = await geocodificar(endereco, { fetchImpl });

    expect(ponto).toEqual({ latitude: -23.55, longitude: -46.63, precisao: "cidade" });
    expect(fetchImpl.mock.calls[1][0].searchParams.get("street")).toBeNull();
  });

  it("guarda a resposta em cache (o Nominatim pede para não repetir consultas)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(resposta([{ lat: "1", lon: "2" }]));

    await geocodificar({ municipio: "Recife", uf: "PE" }, { fetchImpl });
    await geocodificar({ municipio: "Recife", uf: "PE" }, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("devolve null quando nem a cidade existe e lança erro se o serviço falhar", async () => {
    await expect(
      geocodificar({ municipio: "Lugar Nenhum", uf: "SP" }, { fetchImpl: vi.fn().mockResolvedValue(resposta([])) })
    ).resolves.toBeNull();

    await expect(
      geocodificar({ municipio: "Outro", uf: "SP" }, { fetchImpl: vi.fn().mockResolvedValue(resposta({}, 503)) })
    ).rejects.toThrow();
  });
});
