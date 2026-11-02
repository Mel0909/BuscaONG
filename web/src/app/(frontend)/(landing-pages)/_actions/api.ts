// Chamadas da área pública: nossa API (ONGs) e a busca de lugares do Mapbox.
import { filtrosParaParams, type Filtros } from "@/lib/mapa/filtros";
import type { Bbox, Ponto } from "@/lib/mapa/geo";
import type { PinNoMapa, ResultadoLista } from "../_components/tipos";

async function obter<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

/** ONGs perto do ponto (lista). Com limite 0, só a contagem. */
export function buscarLista(ponto: Ponto, filtros: Filtros, limite: number, signal?: AbortSignal) {
  const params = filtrosParaParams(filtros);
  params.set("lat", String(ponto.latitude));
  params.set("lng", String(ponto.longitude));
  params.set("limite", String(limite));
  return obter<ResultadoLista>(`/api/ongs?${params}`, signal);
}

export async function contarOngs(ponto: Ponto, filtros: Filtros, signal?: AbortSignal) {
  return (await buscarLista(ponto, filtros, 0, signal)).total;
}

export function buscarPins(bbox: Bbox, filtros: Filtros, signal?: AbortSignal) {
  const params = filtrosParaParams(filtros);
  params.set("bbox", bbox.map((n) => n.toFixed(5)).join(","));
  return obter<PinNoMapa[]>(`/api/ongs/mapa?${params}`, signal);
}

export type OngEncontrada = { id: string; nome: string; local: string | null; latitude: number; longitude: number };

export function buscarOngsPorNome(texto: string, signal?: AbortSignal) {
  return obter<OngEncontrada[]>(`/api/ongs/busca?${new URLSearchParams({ q: texto })}`, signal);
}

export type LugarEncontrado = { id: string; nome: string; detalhe: string; ponto: Ponto; bbox: Bbox | null };

type RespostaMapbox = {
  features: {
    id: string;
    properties: {
      name: string;
      place_formatted?: string;
      coordinates: { latitude: number; longitude: number };
      bbox?: [number, number, number, number];
    };
  }[];
};

/**
 * Bairros e cidades pela geocodificação do Mapbox (v6). Usada só para mover o mapa:
 * o resultado não é guardado, então a geocodificação comum ("temporária") é permitida.
 */
export async function buscarLugares(texto: string, perto: Ponto, signal?: AbortSignal): Promise<LugarEncontrado[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return [];
  const params = new URLSearchParams({
    q: texto,
    access_token: token,
    country: "br",
    language: "pt",
    limit: "4",
    autocomplete: "true",
    types: "neighborhood,locality,place,district,postcode",
    proximity: `${perto.longitude},${perto.latitude}`,
  });
  const dados = await obter<RespostaMapbox>(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, signal);
  return dados.features.map((f) => ({
    id: f.id,
    nome: f.properties.name,
    detalhe: f.properties.place_formatted ?? "",
    ponto: { latitude: f.properties.coordinates.latitude, longitude: f.properties.coordinates.longitude },
    bbox: f.properties.bbox ?? null,
  }));
}
