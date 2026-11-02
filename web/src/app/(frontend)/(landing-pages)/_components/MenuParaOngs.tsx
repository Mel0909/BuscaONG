'use client'
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ChevronRight, Settings } from "lucide-react";

const OPCOES = [
  { href: "/login", titulo: "Entrar no painel", descricao: "Para ONGs já cadastradas" },
  { href: "/ong/cadastro", titulo: "Cadastrar minha ONG", descricao: "Gratuito. Comece pelo CNPJ." },
];

/** Engrenagem ao lado da busca (P1.1): o caminho da ONG, sem atrapalhar quem só quer ajudar. */
export function MenuParaOngs() {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        aria-label="Para ONGs"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
        className="flex size-12 cursor-pointer items-center justify-center rounded-[15px] border border-borda bg-papel text-musgo shadow-[0_4px_14px_rgba(31,43,36,.08)] hover:bg-salvia-clara"
      >
        <Settings className="size-[22px]" />
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Para ONGs"
          className="absolute right-0 top-[calc(100%+6px)] z-40 flex w-[300px] flex-col gap-3 rounded-[20px] border border-borda-suave bg-papel p-4 shadow-[0_12px_30px_rgba(31,43,36,.18)]"
        >
          <div className="flex flex-col gap-1">
            <span className="font-display text-lg font-semibold">Para ONGs</span>
            <span className="text-[13px] text-tinta-suave">Quem só quer ajudar não precisa de conta.</span>
          </div>
          {OPCOES.map((opcao) => (
            <Link
              key={opcao.href}
              href={opcao.href}
              className="flex items-center justify-between gap-3 rounded-[14px] bg-salvia-clara px-4 py-3 hover:bg-salvia"
            >
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold text-musgo-escuro">{opcao.titulo}</span>
                <span className="text-[13px] text-tinta-suave">{opcao.descricao}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-musgo" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
