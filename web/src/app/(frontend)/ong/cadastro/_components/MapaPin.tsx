'use client'
import { useEffect, useRef } from "react";
import type { Map as MapaMapbox, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export type Posicao = { latitude: number; longitude: number };

// centro do Brasil, para quando ainda não há posição
const CENTRO_BRASIL: [number, number] = [-51.9, -14.2];

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// pin do protótipo: gota musgo com borda papel, girada para a ponta ficar embaixo.
// A ponta fica 48px abaixo do topo do elemento (centro 20px + meia diagonal 28px);
// o círculo tracejado (área aproximada) e a dica ficam em volta dela.
const PONTA_DO_PIN = 28; // px abaixo do centro do elemento

function criarElementoPin() {
  const el = document.createElement("div");
  el.className = "relative size-10";
  el.innerHTML = `
    <div data-area class="pointer-events-none absolute left-1/2 top-[48px] hidden size-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-musgo/35"></div>
    <div class="size-10 -rotate-45 cursor-grab rounded-[50%_50%_50%_4px] border-4 border-papel bg-musgo shadow-[0_6px_14px_rgba(0,0,0,.3)]"></div>
    <div data-dica class="pointer-events-none absolute left-1/2 top-[58px] -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-tinta px-3 py-[7px] text-[13px] font-semibold text-creme">Arraste para ajustar</div>`;
  return el;
}

/**
 * Mapa com um pin arrastável. Clicar no mapa também move o pin.
 * Quando `posicao` muda por fora (ex.: o endereço foi localizado), o mapa voa até ela.
 */
export function MapaPin({
  posicao,
  aoMover,
  areaAproximada,
}: {
  posicao: Posicao | null;
  aoMover: (posicao: Posicao) => void;
  areaAproximada: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaMapbox | null>(null);
  const pin = useRef<Marker | null>(null);
  const aoMoverRef = useRef(aoMover);
  const posicaoInicial = useRef(posicao);

  useEffect(() => {
    aoMoverRef.current = aoMover;
  }, [aoMover]);

  // cria o mapa uma vez (o mapbox-gl só roda no navegador, por isso o import dinâmico)
  useEffect(() => {
    if (!TOKEN || !container.current) return;
    let cancelado = false;

    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (cancelado || !container.current) return;
      const inicial = posicaoInicial.current;

      const m = new mapboxgl.Map({
        accessToken: TOKEN,
        container: container.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: inicial ? [inicial.longitude, inicial.latitude] : CENTRO_BRASIL,
        zoom: inicial ? 16 : 3.5,
        language: "pt",
      });
      m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      const elemento = criarElementoPin();
      const marcador = new mapboxgl.Marker({ element: elemento, draggable: true, anchor: "center", offset: [0, -PONTA_DO_PIN] })
        .setLngLat(inicial ? [inicial.longitude, inicial.latitude] : CENTRO_BRASIL)
        .addTo(m);

      const mover = (lng: number, lat: number) => {
        elemento.querySelector("[data-dica]")?.classList.add("hidden");
        aoMoverRef.current({ latitude: lat, longitude: lng });
      };
      marcador.on("dragend", () => {
        const { lng, lat } = marcador.getLngLat();
        mover(lng, lat);
      });
      m.on("click", (e) => {
        marcador.setLngLat(e.lngLat);
        mover(e.lngLat.lng, e.lngLat.lat);
      });

      mapa.current = m;
      pin.current = marcador;
    });

    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      pin.current = null;
    };
  }, []);

  // posição vinda de fora (localizar endereço)
  useEffect(() => {
    if (!posicao || !mapa.current || !pin.current) return;
    const atual = pin.current.getLngLat();
    if (Math.abs(atual.lat - posicao.latitude) < 1e-7 && Math.abs(atual.lng - posicao.longitude) < 1e-7) return;
    pin.current.setLngLat([posicao.longitude, posicao.latitude]);
    mapa.current.flyTo({ center: [posicao.longitude, posicao.latitude], zoom: 16 });
  }, [posicao]);

  useEffect(() => {
    pin.current?.getElement().querySelector("[data-area]")?.classList.toggle("hidden", !areaAproximada);
  }, [areaAproximada]);

  if (!TOKEN) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-borda bg-salvia-clara p-6 text-center text-sm text-tinta-suave">
        <strong className="text-tinta">Mapa indisponível</strong>
        <span>Falta configurar NEXT_PUBLIC_MAPBOX_TOKEN. A posição vem do endereço informado.</span>
        {posicao && <span className="font-mono">{formatarPosicao(posicao)}</span>}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[20px] bg-salvia-clara">
      {/* altura explícita: o CSS do mapbox-gl força position: relative no contêiner do mapa */}
      <div ref={container} className="h-[440px] w-full" />
      {posicao && (
        // no topo: embaixo ficam o logo e a atribuição do Mapbox, que precisam ficar visíveis
        <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-papel px-[13px] py-[9px] font-mono text-[13px] font-medium text-tinta-suave">
          {formatarPosicao(posicao)}
        </div>
      )}
    </div>
  );
}

export function formatarPosicao({ latitude, longitude }: Posicao) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}
