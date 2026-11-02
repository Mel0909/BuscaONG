'use client'
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type Props = {
  titulo: string;
  subtitulo?: string;
  aoFechar: () => void;
  children: ReactNode;
  /** largura no computador */
  largura?: "estreito" | "largo";
  className?: string;
};

/**
 * Janela por cima da página: folha que sobe do pé da tela no celular, caixa centralizada no
 * computador. Esc e o fundo fecham; o foco vai para dentro ao abrir e volta ao sair.
 */
export function Dialogo({ titulo, subtitulo, aoFechar, children, largura = "estreito", className }: Props) {
  const id = useId();
  const caixa = useRef<HTMLDivElement>(null);
  // o Esc chama sempre a versão mais recente de aoFechar, sem refazer o efeito de abrir
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  }, [aoFechar]);

  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    const primeiro = caixa.current?.querySelector<HTMLElement>("input, textarea, select, button:not([data-fechar])");
    (primeiro ?? caixa.current)?.focus();

    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    document.addEventListener("keydown", esc);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = rolagem;
      antes?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-labelledby={id}>
      <button type="button" aria-label="Fechar" data-fechar onClick={aoFechar} className="absolute inset-0 cursor-default bg-tinta/45" />
      <div
        ref={caixa}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col gap-5 overflow-y-auto rounded-t-[28px] bg-papel px-5 pb-8 pt-3 outline-none md:rounded-[24px] md:px-8 md:py-7",
          largura === "largo" ? "md:max-w-[720px]" : "md:max-w-[480px]",
          className
        )}
      >
        <span className="mx-auto h-[5px] w-10 shrink-0 rounded-full bg-borda md:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id={id} className="font-display text-[22px] font-semibold leading-tight tracking-[-0.01em]">
              {titulo}
            </h2>
            {subtitulo && <p className="text-sm text-tinta-suave">{subtitulo}</p>}
          </div>
          <button
            type="button"
            data-fechar
            aria-label="Fechar"
            onClick={aoFechar}
            className="-mr-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-tinta-suave hover:bg-salvia-clara hover:text-tinta"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
