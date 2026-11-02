import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Peças visuais da área admin (A1 a A4): neutras e densas.

export const estiloBotaoEscuro =
  "flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] bg-grafite px-3 text-[13px] font-semibold text-branco hover:bg-grafite-ativo disabled:cursor-not-allowed disabled:opacity-50";
export const estiloBotaoClaro =
  "flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border border-cinza-borda bg-branco px-3 text-[13px] font-semibold text-tinta hover:bg-cinza-cabecalho disabled:cursor-not-allowed disabled:opacity-50";
/** ação destrutiva (excluir): contorno e texto terracota, como no protótipo */
export const estiloBotaoPerigo =
  "flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] border border-terracota/40 bg-branco px-3 text-[13px] font-semibold text-terracota-escura hover:bg-terracota-clara disabled:cursor-not-allowed disabled:opacity-50";
export const estiloCampoAdmin =
  "h-9 w-full rounded-[9px] border border-cinza-borda bg-branco px-3 text-[13px] outline-none focus:border-2 focus:border-grafite";
export const estiloCabecalhoTabela =
  "bg-cinza-cabecalho px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-cinza-texto";

export function TituloAdmin({ children }: { children: ReactNode }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-cinza-texto">{children}</h2>;
}

/** Filtro em forma de chip (link que muda a URL), com a contagem. */
export function ChipFiltro({ href, ativo, children }: { href: string; ativo: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "true" : undefined}
      className={cn(
        "flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-[11px] text-[13px]",
        ativo ? "bg-grafite font-semibold text-branco" : "border border-cinza-borda bg-branco font-medium hover:bg-cinza-cabecalho"
      )}
    >
      {children}
    </Link>
  );
}

export function Selo({ tipo, children }: { tipo: "ok" | "neutro" | "alerta"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-[3px] text-xs font-semibold",
        tipo === "ok" && "bg-salvia text-musgo-escuro",
        tipo === "neutro" && "bg-cinza-linha text-cinza-texto",
        tipo === "alerta" && "bg-terracota-clara text-terracota-escura"
      )}
    >
      {children}
    </span>
  );
}

/** Lista à esquerda e ficha à direita (no celular, a ficha vem depois da lista). */
export function ListaEFicha({ lista, ficha }: { lista: ReactNode; ficha: ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-[1fr_400px]">
      <div className="flex min-w-0 flex-col gap-3.5 px-4 py-5 md:px-6">{lista}</div>
      <aside className="flex flex-col gap-3 border-t border-cinza-borda bg-branco px-5 py-[18px] lg:border-l lg:border-t-0">{ficha}</aside>
    </div>
  );
}

/** "02/10 14:20" no horário de Brasília */
export const dataCurta = (data: Date) =>
  data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).replace(",", "");

/** "há 2 h", "ontem", "29/09" */
export function quandoFoi(data: Date, agora = new Date()) {
  const horas = (agora.getTime() - data.getTime()) / 3_600_000;
  if (horas < 1) return `há ${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 24) return `há ${Math.round(horas)} h`;
  if (horas < 48) return "ontem";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}
