'use client'
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { formatarDistancia } from "@/lib/mapa/geo";
import { iniciais } from "@/utils/formatters/texto";
import { ArrowRight } from "lucide-react";
import type { OngNaLista } from "./tipos";

type Props = {
  ong: OngNaLista;
  /** há filtro de item ou de voluntariado: o card mostra o que bateu, em mel */
  comFiltroDeItem: boolean;
  comFiltroDeHorario: boolean;
  selecionada: boolean;
  /** "lat,lng" de onde as distâncias são medidas, para a página da ONG mostrar a mesma distância */
  de: string;
  aoEscolher: () => void;
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/**
 * Card da lista (P1/P3). Tocar seleciona a ONG e leva o mapa até ela; a selecionada mostra
 * o caminho para a página da ONG (P5).
 */
export function CartaoResultado({ ong, comFiltroDeItem, comFiltroDeHorario, selecionada, de, aoEscolher }: Props) {
  const outrosItens = ong.itens.length - ong.itensQueBatem.length;
  const urgente = ong.urgentes.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[20px] border bg-papel transition-colors",
        selecionada ? "border-2 border-musgo" : "border-borda-suave hover:border-borda"
      )}
    >
      <button
        type="button"
        id={`ong-${ong.id}`}
        onClick={aoEscolher}
        aria-current={selecionada ? "true" : undefined}
        className="flex w-full cursor-pointer gap-3 p-[14px] text-left"
      >
        <span className="relative flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-salvia font-display text-[17px] font-bold text-musgo">
          {ong.logoUrl ? <Image src={ong.logoUrl} alt="" fill unoptimized className="object-cover" /> : iniciais(ong.nome)}
        </span>

        {/* dentro de botão só cabe texto em linha: tudo é span */}
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-base font-semibold leading-tight">{ong.nome}</span>
          <span className="text-[13px] font-medium text-tinta-suave">
            {[ong.causa, ong.local, formatarDistancia(ong.distanciaKm)].filter(Boolean).join(" · ")}
          </span>

          {urgente && (
            <span className="self-start rounded-md bg-terracota px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-papel">
              Urgente · {ong.urgentes.join(", ")}
            </span>
          )}

          {comFiltroDeItem && ong.itensQueBatem.length > 0 && (
            <span className="flex flex-col gap-1">
              <span className="self-start rounded-lg bg-mel px-2 py-1 text-xs font-semibold text-mel-escuro">
                ✓ Precisa de {ong.itensQueBatem.join(", ")}
              </span>
              {outrosItens > 0 && (
                <span className="text-xs text-tinta-suave">+ {plural(outrosItens, "outro item", "outros itens")}</span>
              )}
            </span>
          )}

          {comFiltroDeHorario &&
            ong.horariosQueBatem.map((horario) => (
              <span key={horario} className="self-start rounded-lg bg-mel px-2 py-1 text-xs font-semibold text-mel-escuro">
                ✓ {horario}
              </span>
            ))}

          {!comFiltroDeItem && !comFiltroDeHorario && ong.itens.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {ong.itens.slice(0, 3).map((item) => (
                <span key={item} className="rounded-lg bg-salvia-clara px-2 py-1 text-xs font-medium text-musgo-escuro">
                  {item}
                </span>
              ))}
              {ong.itens.length > 3 && <span className="px-1 py-1 text-xs text-tinta-suave">+{ong.itens.length - 3}</span>}
            </span>
          )}
        </span>
      </button>

      {selecionada && (
        <Link
          href={`/ong/${ong.endereco}?de=${de}`}
          className="flex items-center justify-between gap-2 border-t border-borda-suave bg-salvia-clara px-[14px] py-3 text-sm font-semibold text-musgo hover:bg-salvia"
        >
          Ver página da ONG
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
