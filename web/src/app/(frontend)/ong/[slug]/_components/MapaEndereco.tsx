/* eslint-disable @next/next/no-img-element -- imagem estática do Mapbox, já no tamanho certo */
import { ExternalLink } from "lucide-react";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const ZOOM_EXATO = 15;
const ZOOM_APROXIMADO = 14;

type Props = {
  posicao: { latitude: number; longitude: number; aproximada: boolean };
  endereco: string;
};

/**
 * Endereço com mapa focado (P5, abaixo da dobra). Usa a Static Images API do Mapbox (uma imagem,
 * sem carregar o mapa interativo). Quem mostra só o bairro aparece como uma área, sem pin.
 */
export function MapaEndereco({ posicao, endereco }: Props) {
  const { latitude, longitude, aproximada } = posicao;
  const centro = `${longitude.toFixed(5)},${latitude.toFixed(5)}`;
  const pin = aproximada ? "" : `pin-l+2E5E45(${centro})/`;
  const imagem = TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pin}${centro},${aproximada ? ZOOM_APROXIMADO : ZOOM_EXATO},0/640x260@2x?access_token=${TOKEN}`
    : null;
  // "Como chegar" abre o app de mapas; para quem mostra só o bairro, busca pelo bairro
  const comoChegar = aproximada
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <div className="flex flex-col gap-3">
      {imagem && (
        <div className="relative overflow-hidden rounded-[18px] border border-borda-suave bg-salvia-clara">
          <img src={imagem} alt={`Mapa: ${endereco}`} width={640} height={260} loading="lazy" className="h-auto w-full" />
          {aproximada && (
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 size-[110px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-musgo bg-musgo/20"
            />
          )}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <p className="text-[15px] leading-normal">
          {endereco}
          {aproximada && <span className="block text-[13px] text-tinta-suave">A ONG mostra só a região. Combine o endereço pelo contato.</span>}
        </p>
        <a
          href={comoChegar}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-musgo underline underline-offset-2"
        >
          Como chegar <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
