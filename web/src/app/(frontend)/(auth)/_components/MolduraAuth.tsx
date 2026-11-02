import Link from "next/link";
import type { ReactNode } from "react";

import BuscaOngLogo from "@/components/base/brand/BuscaOngLogo";

const VANTAGENS = [
  "Marque itens urgentes: o pin fica terracota no mapa",
  "Atualize itens, horários de voluntariado e contatos",
  "Sem mensalidade e sem fila de aprovação",
];

/** Moldura das telas de acesso da ONG: formulário à esquerda, painel musgo à direita (computador). */
export function MolduraAuth({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[1fr_44%]">
      <main className="flex flex-col gap-10 px-5 py-8 md:px-16 md:py-12">
        <Link href="/" aria-label="BuscaONG: ir para o mapa" className="self-start">
          <BuscaOngLogo size={32} />
        </Link>
        <div className="flex w-full max-w-[440px] flex-1 flex-col justify-center gap-7 self-center pb-10">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em]">{titulo}</h1>
            {subtitulo && <p className="text-base leading-normal text-tinta-suave">{subtitulo}</p>}
          </div>
          {children}
        </div>
      </main>

      <aside className="hidden flex-col justify-center gap-6 bg-musgo-escuro px-14 text-salvia-clara md:flex">
        <span className="font-display text-[28px] font-semibold leading-tight text-papel">Painel da ONG</span>
        <ul className="flex flex-col gap-3 text-[15px] leading-normal">
          {VANTAGENS.map((v) => (
            <li key={v} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-musgo-claro text-xs font-bold text-papel">
                ✓
              </span>
              {v}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
