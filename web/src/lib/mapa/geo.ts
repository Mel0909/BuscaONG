// Contas de geografia da área pública (sem dependência de servidor: usadas também na tela).

export type Ponto = { latitude: number; longitude: number };
/** [oeste, sul, leste, norte], em graus (mesma ordem do Mapbox) */
export type Bbox = [number, number, number, number];

const RAIO_TERRA_KM = 6371;
const rad = (graus: number) => (graus * Math.PI) / 180;

/** Distância em linha reta entre dois pontos (fórmula de haversine), em km. */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

/** 0.84 → "840 m"; 4.6 → "4,6 km"; 23.4 → "23 km" */
export function formatarDistancia(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

export function dentroDoBbox({ latitude, longitude }: Ponto, [oeste, sul, leste, norte]: Bbox): boolean {
  return latitude >= sul && latitude <= norte && longitude >= oeste && longitude <= leste;
}

/**
 * Área visível dentro do que a API aceita. Com o mapa bem afastado, o Mapbox mostra o mundo
 * repetido e devolve longitudes além de ±180: aí vale o mundo inteiro.
 */
export function limitarBbox([oeste, sul, leste, norte]: Bbox): Bbox {
  const mundoTodo = leste - oeste >= 360 || oeste < -180 || leste > 180;
  return [mundoTodo ? -180 : oeste, Math.max(-90, sul), mundoTodo ? 180 : leste, Math.min(90, norte)];
}

/** Número entre 0 e 1 de um gerador criptográfico (imprevisível, ao contrário do Math.random). */
const aleatorio = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

/** Deslocamento usado para ONGs que mostram só o bairro (abrigos que não divulgam o endereço). */
export const RAIO_APROXIMADO_KM = 0.4;

/**
 * Posição aproximada de uma ONG: desloca o ponto entre 150 m e 400 m numa direção sorteada.
 * O resultado é sorteado uma vez, ao salvar a localização, e guardado (`localizacaoPublica`):
 * nada público pode servir para recalcular o desvio e chegar ao endereço.
 */
export function posicaoAproximada({ latitude, longitude }: Ponto, sortear: () => number = aleatorio): Ponto {
  const angulo = sortear() * 2 * Math.PI;
  const distancia = 0.15 + sortear() * (RAIO_APROXIMADO_KM - 0.15);
  const dLat = (distancia / RAIO_TERRA_KM) * (180 / Math.PI);
  const dLng = dLat / Math.cos(rad(latitude));
  return { latitude: latitude + dLat * Math.sin(angulo), longitude: longitude + dLng * Math.cos(angulo) };
}

/** Onde o mapa abre quando a pessoa não compartilha a localização (São Paulo). */
export const CENTRO_PADRAO: Ponto = { latitude: -23.5505, longitude: -46.6333 };
