import { describe, expect, it } from "vitest";
import { fatiasDoBbox, montarFiltro } from "@/backend/services/ongs/publico";
import { contarFiltros, FILTROS_VAZIOS, filtrosParaParams, paramsParaFiltrosCrus } from "@/lib/mapa/filtros";
import { dentroDoBbox, distanciaKm, formatarDistancia, limitarBbox, posicaoAproximada } from "@/lib/mapa/geo";

const SE = { latitude: -23.5505, longitude: -46.6333 };
const CAMPINAS = { latitude: -22.9056, longitude: -47.0608 };

describe("geo", () => {
  it("área do mapa: dentro de ±180, ou o mundo inteiro quando o Mapbox repete o mapa", () => {
    expect(limitarBbox([-47, -24, -46, -23])).toEqual([-47, -24, -46, -23]);
    expect(limitarBbox([-250, -85, 250, 85])).toEqual([-180, -85, 180, 85]);
    expect(limitarBbox([150, -30, 210, 10])).toEqual([-180, -30, 180, 10]);
  });

  it("fatias de até 90° cobrindo a área toda", () => {
    expect(fatiasDoBbox([-47, -24, -46, -23])).toEqual([[-47, -24, -46, -23]]);
    expect(fatiasDoBbox([-180, -85, 180, 85])).toEqual([
      [-180, -85, -90, 85],
      [-90, -85, 0, 85],
      [0, -85, 90, 85],
      [90, -85, 180, 85],
    ]);
  });

  it("calcula a distância em linha reta", () => {
    expect(distanciaKm(SE, CAMPINAS)).toBeGreaterThan(80);
    expect(distanciaKm(SE, CAMPINAS)).toBeLessThan(90);
    expect(distanciaKm(SE, SE)).toBe(0);
  });

  it.each([
    [0.004, "10 m"],
    [0.843, "840 m"],
    [4.62, "4,6 km"],
    [23.4, "23 km"],
  ])("formata %s km como %s", (km, texto) => {
    expect(formatarDistancia(km)).toBe(texto);
  });

  it("confere se o ponto está na área do mapa", () => {
    expect(dentroDoBbox(SE, [-46.7, -23.6, -46.6, -23.5])).toBe(true);
    expect(dentroDoBbox(CAMPINAS, [-46.7, -23.6, -46.6, -23.5])).toBe(false);
  });

  it("posição aproximada: sorteada entre 150 m e 400 m do ponto real", () => {
    for (let i = 0; i < 50; i++) {
      const distancia = distanciaKm(SE, posicaoAproximada(SE));
      expect(distancia).toBeGreaterThanOrEqual(0.149);
      expect(distancia).toBeLessThanOrEqual(0.401);
    }
    // sorteio de verdade: não dá para recalcular a partir de nada público
    expect(posicaoAproximada(SE)).not.toEqual(posicaoAproximada(SE));
    // com o sorteio fixo, o resultado é previsível (direção norte, a 150 m)
    const norte = posicaoAproximada(SE, () => 0.25);
    expect(norte.longitude).toBeCloseTo(SE.longitude, 6);
    expect(distanciaKm(SE, posicaoAproximada(SE, () => 0))).toBeCloseTo(0.15, 3);
  });
});

describe("filtros na URL", () => {
  it("vai e volta pelos parâmetros repetidos", () => {
    const filtros = { ...FILTROS_VAZIOS, causas: ["animais", "idosos"], livres: ["cadeira de rodas"], dias: ["SABADO" as const] };
    const params = filtrosParaParams(filtros);

    expect(params.toString()).toBe("causa=animais&causa=idosos&livre=cadeira+de+rodas&dia=SABADO");
    expect(paramsParaFiltrosCrus(params)).toMatchObject({ causas: ["animais", "idosos"], livres: ["cadeira de rodas"], dias: ["SABADO"] });
    expect(contarFiltros(filtros)).toBe(4);
  });
});

describe("montarFiltro", () => {
  it("sem filtros, só ONGs publicadas", () => {
    expect(montarFiltro(FILTROS_VAZIOS)).toEqual({ status: "PUBLICADA" });
  });

  it("dentro do grupo é OU; itens da lista e livres contam como o mesmo grupo", () => {
    expect(montarFiltro({ ...FILTROS_VAZIOS, causas: ["animais", "idosos"], itens: ["fraldas"], livres: ["racao"] })).toEqual({
      status: "PUBLICADA",
      causas: { $in: ["animais", "idosos"] },
      $or: [{ itens: { $in: ["fraldas"] } }, { "itensLivres.chave": { $in: ["racao"] } }],
    });
  });

  it("voluntariado: o mesmo horário precisa bater dia, turno e atividade; sábado vale fim de semana e todo dia", () => {
    expect(montarFiltro({ ...FILTROS_VAZIOS, dias: ["SABADO"], turnos: ["MANHA"], atividades: ["recreacao"] })).toEqual({
      status: "PUBLICADA",
      aceitaVoluntarios: true,
      horariosVoluntariado: {
        $elemMatch: {
          dia: { $in: ["SABADO", "FIM_DE_SEMANA", "TODO_DIA"] },
          turnos: { $in: ["MANHA"] },
          atividade: { $in: ["recreacao"] },
        },
      },
    });
  });
});
