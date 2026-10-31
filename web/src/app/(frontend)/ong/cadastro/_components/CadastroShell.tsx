'use client'
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BuscaOngMark } from "@/components/base/brand/BuscaOngLogo";
import { AVISO_LATERAL, AVISO_LATERAL_PADRAO, PASSOS, passoDaRota } from "./passos";

function MarcaParaOngs() {
  return (
    <div className="flex items-center gap-2.5">
      <BuscaOngMark size={30} variant="dark" />
      <span className="font-display text-lg font-bold">BuscaONG</span>
      <span className="text-[13px] font-medium text-salvia-apagada">para ONGs</span>
    </div>
  );
}

// moldura do cadastro: barra lateral musgo-escuro com os 8 passos (protótipo O1)
export function CadastroShell({ children }: { children: ReactNode }) {
  const atual = passoDaRota(usePathname());
  const passoAtual = PASSOS[atual - 1];

  return (
    <div className="min-h-screen md:grid md:grid-cols-[320px_1fr]">
      {/* celular: barra no topo com o progresso */}
      <header className="bg-musgo-escuro px-4 py-4 text-salvia-clara md:hidden">
        <MarcaParaOngs />
        <p className="mt-3 text-sm text-salvia-apagada">
          Passo {atual} de {PASSOS.length} · <span className="font-semibold text-papel">{passoAtual.nome}</span>
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-musgo-linha" aria-hidden="true">
          <div className="h-full rounded-full bg-salvia" style={{ width: `${(atual / PASSOS.length) * 100}%` }} />
        </div>
      </header>

      {/* desktop: barra lateral */}
      <aside className="hidden flex-col gap-7 bg-musgo-escuro px-7 py-8 text-salvia-clara md:flex">
        <MarcaParaOngs />

        <ol className="flex flex-col gap-1" aria-label="Passos do cadastro">
          {PASSOS.map((passo) => {
            const feito = passo.numero < atual;
            const corrente = passo.numero === atual;
            return (
              <li
                key={passo.numero}
                className="flex items-center gap-3 py-[7px]"
                aria-current={corrente ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs",
                    feito && "bg-musgo-claro font-bold text-papel",
                    corrente && "bg-salvia font-bold text-musgo-escuro",
                    !feito && !corrente && "border-[1.5px] border-musgo-linha font-semibold text-salvia-apagada"
                  )}
                >
                  {feito ? "✓" : passo.numero}
                </span>
                <span
                  className={cn(
                    "text-[15px]",
                    feito && "font-medium text-salvia-media",
                    corrente && "font-semibold text-papel",
                    !feito && !corrente && "font-medium text-salvia-apagada"
                  )}
                >
                  {passo.nome}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="mt-auto text-[13px] leading-normal text-salvia-apagada">
          {AVISO_LATERAL[atual] ?? AVISO_LATERAL_PADRAO}
        </p>
      </aside>

      <main className="px-4 py-8 md:px-[72px] md:py-14">{children}</main>
    </div>
  );
}
