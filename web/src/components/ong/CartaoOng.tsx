import Image from "next/image";

import { iniciais } from "@/utils/formatters/texto";

export type DadosCartaoOng = {
  nome: string;
  logoUrl: string | null;
  /** "Orfanatos · Vila Mariana" */
  subtitulo: string;
  /** até 3 itens que a ONG costuma precisar */
  itens: string[];
  /** itens com urgência ativa: selo "URGENTE" */
  urgentes?: string[];
};

/** Card da ONG no mapa e na lista (protótipo: "Card no mapa e na lista"). */
export function CartaoOng({ nome, logoUrl, subtitulo, itens, urgentes = [] }: DadosCartaoOng) {
  return (
    <article className="flex gap-3 rounded-[20px] border border-borda-suave bg-papel p-[14px]">
      <div className="relative flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-salvia font-display text-[17px] font-bold text-musgo">
        {logoUrl ? <Image src={logoUrl} alt="" fill unoptimized className="object-cover" /> : iniciais(nome)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="text-base font-semibold">{nome}</h3>
        {subtitulo && <p className="text-[13px] font-medium text-tinta-suave">{subtitulo}</p>}
        {urgentes.length > 0 && (
          <p className="self-start rounded-md bg-terracota px-2 py-[3px] text-[11px] font-bold uppercase tracking-[0.04em] text-papel">
            Urgente · {urgentes.join(", ")}
          </p>
        )}
        {itens.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {itens.map((item) => (
              <li key={item} className="rounded-lg bg-salvia-clara px-2 py-1 text-xs font-medium text-musgo-escuro">
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
