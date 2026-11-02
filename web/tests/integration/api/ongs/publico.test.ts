import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/backend/services/db";
import { limparCacheNomes } from "@/backend/services/ongs";
import { distanciaKm } from "@/lib/mapa/geo";
import { resetRateLimit } from "@/utils/api/server";

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { aggregateRaw: vi.fn(), findRaw: vi.fn() },
    opcaoLista: { findMany: vi.fn() },
  },
}));

import { GET as getLista } from "@/backend/api/ongs/route";
import { GET as getMapa } from "@/backend/api/ongs/mapa/route";
import { GET as getBusca } from "@/backend/api/ongs/busca/route";

const db = vi.mocked(prisma, { deep: true });
const get = (caminho: string) => new NextRequest(`http://localhost:3000/api/${caminho}`);

const SE = { lat: -23.5505, lng: -46.6333 };

// documento como o MongoDB devolve nas consultas cruas
const ongCrua = (extra: Record<string, unknown> = {}) => ({
  _id: { $oid: "6ae67eea8cf900bcea8cfe24" },
  nomePublico: "Casa Lar Esperança",
  logo: null,
  causas: ["orfanatos", "educacao"],
  itens: ["fraldas", "leite-em-po"],
  itensLivres: [{ nome: "Fraldas tamanho G", chave: "fraldas tamanho g" }],
  aceitaVoluntarios: true,
  horariosVoluntariado: [
    { dia: "SABADO", inicio: 8, fim: 12, atividade: "recreacao", atividadeOutra: null, turnos: ["MANHA"] },
    { dia: "QUARTA", inicio: 14, fim: 17, atividade: "outra", atividadeOutra: "Oficinas", turnos: ["TARDE"] },
  ],
  endereco: { bairro: "Vila Mariana", municipio: "São Paulo" },
  localizacaoPublica: { type: "Point", coordinates: [-46.6345, -23.5893] },
  mostrarSoBairro: false,
  ...extra,
});

describe("área pública", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    limparCacheNomes();
    db.opcaoLista.findMany.mockResolvedValue([
      { tipo: "CAUSA", slug: "orfanatos", nome: "Orfanatos" },
      { tipo: "ITEM", slug: "fraldas", nome: "Fraldas" },
      { tipo: "ITEM", slug: "leite-em-po", nome: "Leite em pó" },
      { tipo: "ATIVIDADE", slug: "recreacao", nome: "Recreação" },
    ] as never);
  });

  describe("GET /api/ongs (lista)", () => {
    it("busca as mais próximas do ponto com os filtros e monta os cards", async () => {
      db.ong.aggregateRaw.mockResolvedValue([{ total: [{ n: 12 }], ongs: [ongCrua()] }] as never);

      const response = await getLista(get(`ongs?lat=${SE.lat}&lng=${SE.lng}&limite=10&item=fraldas&dia=SABADO`));
      const body = await response.json();

      expect(response.status).toBe(200);
      const { pipeline } = db.ong.aggregateRaw.mock.calls[0][0] as { pipeline: Record<string, Record<string, unknown>>[] };
      expect(pipeline[0].$geoNear).toMatchObject({
        near: { type: "Point", coordinates: [SE.lng, SE.lat] },
        maxDistance: 50_000,
        key: "localizacaoPublica",
        query: { status: "PUBLICADA", $or: [{ itens: { $in: ["fraldas"] } }] },
      });
      expect(body.total).toBe(12);
      expect(body.ongs[0]).toMatchObject({
        id: "6ae67eea8cf900bcea8cfe24",
        nome: "Casa Lar Esperança",
        causa: "Orfanatos",
        local: "Vila Mariana",
        aproximada: false,
        itens: ["Fraldas", "Leite em pó", "Fraldas tamanho G"],
        itensQueBatem: ["Fraldas"],
        horarios: ["Sáb · 8h – 12h · Recreação", "Qua · 14h – 17h · Oficinas"],
        horariosQueBatem: ["Sáb · 8h – 12h · Recreação"],
        endereco: "6ae67eea8cf900bcea8cfe24",
        urgentes: [],
      });
      expect(body.ongs[0].distanciaKm).toBeCloseTo(4.3, 0);
    });

    it("ONG que mostra só o bairro sai na posição pública guardada, marcada como aproximada", async () => {
      const publica = [-46.637, -23.5871];
      db.ong.aggregateRaw.mockResolvedValue([
        { total: [{ n: 1 }], ongs: [ongCrua({ mostrarSoBairro: true, localizacaoPublica: { type: "Point", coordinates: publica } })] },
      ] as never);

      const body = await (await getLista(get(`ongs?lat=${SE.lat}&lng=${SE.lng}`))).json();

      expect(body.ongs[0]).toMatchObject({ aproximada: true, latitude: publica[1], longitude: publica[0] });
      // a consulta nem pede a posição real
      const { pipeline } = db.ong.aggregateRaw.mock.calls[0][0] as { pipeline: Record<string, Record<string, unknown>>[] };
      expect(JSON.stringify(pipeline)).not.toContain('"localizacao"');
    });

    it("com limite 0 devolve só a contagem", async () => {
      db.ong.aggregateRaw.mockResolvedValue([{ total: [{ n: 3 }] }] as never);

      const body = await (await getLista(get(`ongs?lat=${SE.lat}&lng=${SE.lng}&limite=0`))).json();

      expect(body).toEqual({ total: 3, ongs: [] });
      const { pipeline } = db.ong.aggregateRaw.mock.calls[0][0] as { pipeline: { $facet?: object }[] };
      expect(pipeline[1].$facet).not.toHaveProperty("ongs");
    });

    it.each([
      ["sem ponto", "ongs"],
      ["dia inválido", `ongs?lat=${SE.lat}&lng=${SE.lng}&dia=FERIADO`],
      ["limite alto demais", `ongs?lat=${SE.lat}&lng=${SE.lng}&limite=500`],
    ])("400 %s", async (_, caminho) => {
      expect((await getLista(get(caminho))).status).toBe(400);
      expect(db.ong.aggregateRaw).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/ongs/mapa (pins)", () => {
    it("busca dentro do polígono da área visível", async () => {
      db.ong.findRaw.mockResolvedValue([ongCrua()] as never);

      const body = await (await getMapa(get("ongs/mapa?bbox=-46.7,-23.6,-46.6,-23.5&causa=orfanatos"))).json();

      const { filter } = db.ong.findRaw.mock.calls[0][0] as {
        filter: { localizacaoPublica: { $geoWithin: { $geometry: { coordinates: number[][][] } } } };
      };
      expect(filter).toMatchObject({ status: "PUBLICADA", causas: { $in: ["orfanatos"] } });
      expect(filter).not.toHaveProperty("localizacao");
      // lados com pontos intermediários (os lados de um polígono no MongoDB são arcos), passando pelos cantos
      const anel = filter.localizacaoPublica.$geoWithin.$geometry.coordinates[0];
      expect(anel.length).toBeGreaterThan(5);
      expect(anel).toEqual(expect.arrayContaining([[-46.7, -23.6], [-46.6, -23.6], [-46.6, -23.5], [-46.7, -23.5]]));
      expect(anel[0]).toEqual(anel[anel.length - 1]);
      expect(body).toEqual([
        { id: "6ae67eea8cf900bcea8cfe24", nome: "Casa Lar Esperança", latitude: -23.5893, longitude: -46.6345, urgente: false },
      ]);
    });

    it("pin de ONG com urgência que ainda vale sai marcado como urgente", async () => {
      const amanha = new Date(Date.now() + 86_400_000).toISOString();
      const ontem = new Date(Date.now() - 86_400_000).toISOString();
      db.ong.findRaw.mockResolvedValue([
        ongCrua({ urgencias: [{ ate: { $date: amanha } }] }),
        ongCrua({ _id: { $oid: "vencida" }, urgencias: [{ ate: { $date: ontem } }] }),
      ] as never);

      const body = await (await getMapa(get("ongs/mapa?bbox=-46.7,-23.6,-46.6,-23.5"))).json();

      expect(body.map((p: { urgente: boolean }) => p.urgente)).toEqual([true, false]);
    });

    it("mapa bem afastado: a área vira fatias de até 90°, sem perder os filtros de item", async () => {
      db.ong.findRaw.mockResolvedValue([] as never);
      await getMapa(get("ongs/mapa?bbox=-180,-85,180,85&item=fraldas"));

      const { filter } = db.ong.findRaw.mock.calls[0][0] as {
        filter: { $or?: unknown; $and: [{ $or: { localizacaoPublica: { $geoWithin: { $geometry: { coordinates: number[][][] } } } }[] }] };
      };
      const fatias = filter.$and[0].$or.map((f) => f.localizacaoPublica.$geoWithin.$geometry.coordinates[0]);
      expect(fatias).toHaveLength(4);
      for (const anel of fatias) {
        const lngs = anel.map(([lng]) => lng);
        expect(Math.max(...lngs) - Math.min(...lngs)).toBeLessThanOrEqual(90);
      }
      expect(filter).not.toHaveProperty("localizacaoPublica");
      expect(filter.$or).toBeDefined(); // o $or dos itens continua lá
    });

    it.each(["", "bbox=1,2,3", "bbox=10,0,5,5", "bbox=a,b,c,d"])("400 para bbox inválido (%s)", async (q) => {
      expect((await getMapa(get(`ongs/mapa?${q}`))).status).toBe(400);
    });
  });

  describe("GET /api/ongs/busca", () => {
    it("procura pelo nome, sem diferenciar maiúsculas, e escapa caracteres de regex", async () => {
      db.ong.findRaw.mockResolvedValue([ongCrua(), ongCrua({ _id: { $oid: "sem-local" }, localizacaoPublica: null })] as never);

      const body = await (await getBusca(get("ongs/busca?q=casa.lar"))).json();

      const { filter } = db.ong.findRaw.mock.calls[0][0] as { filter: Record<string, unknown> };
      expect(filter).toEqual({ status: "PUBLICADA", nomePublico: { $regex: "casa\\.lar", $options: "i" } });
      expect(body).toEqual([
        { id: "6ae67eea8cf900bcea8cfe24", nome: "Casa Lar Esperança", local: "Vila Mariana", latitude: -23.5893, longitude: -46.6345 },
      ]);
    });

    it("400 com menos de 2 letras", async () => {
      expect((await getBusca(get("ongs/busca?q=c"))).status).toBe(400);
    });
  });
});
