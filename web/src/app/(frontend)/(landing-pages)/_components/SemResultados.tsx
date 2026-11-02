'use client'
import Link from "next/link";
import { useEffect, useState } from "react";

import { FILTROS_VAZIOS, type Filtros } from "@/lib/mapa/filtros";
import type { Ponto } from "@/lib/mapa/geo";
import { ArrowRight } from "lucide-react";
import { contarOngs } from "../_actions/api";
import { filtrosAtivos, semFiltro, type FiltroAtivo, type OpcoesFiltro } from "./tipos";

type Props = {
  filtros: Filtros;
  opcoes: OpcoesFiltro;
  referencia: Ponto;
  raioKm: number;
  aoMudarFiltros: (filtros: Filtros) => void;
};

/**
 * Lista vazia (P4). Sem filtros: ainda não há ONGs por perto. Com filtros: a busca não é
 * ampliada sozinha; sugere qual filtro remover, com quantas ONGs apareceriam.
 */
export function SemResultados({ filtros, opcoes, referencia, raioKm, aoMudarFiltros }: Props) {
  const ativos = filtrosAtivos(filtros, opcoes);
  const [contagens, setContagens] = useState<Record<string, number>>({});

  useEffect(() => {
    if (ativos.length === 0) return;
    const controle = new AbortController();
    Promise.all(
      ativos.map(async (a) => [chave(a), await contarOngs(referencia, semFiltro(filtros, a), controle.signal)] as const)
    )
      .then((pares) => setContagens(Object.fromEntries(pares)))
      .catch(() => {});
    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, referencia]);

  if (ativos.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-[20px] border border-borda-suave bg-papel p-5">
        <span className="font-display text-lg font-semibold">Ainda não há ONGs publicadas por aqui</span>
        <span className="text-sm leading-normal text-tinta-suave">
          Nenhuma ONG a até {raioKm} km. Busque outro bairro ou cidade, ou conte para uma ONG que ela pode se cadastrar.
        </span>
        <Link href="/ong/cadastro" className="self-start text-sm font-semibold text-musgo underline underline-offset-2">
          Cadastrar minha ONG
        </Link>
      </div>
    );
  }

  // as remoções que mais trazem resultados primeiro
  const sugestoes = [...ativos].sort((a, b) => (contagens[chave(b)] ?? 0) - (contagens[chave(a)] ?? 0));

  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-borda-suave bg-papel p-5">
      <span className="font-display text-lg font-semibold">Nenhuma ONG com todos esses filtros</span>
      <span className="text-sm leading-normal text-tinta-suave">
        A busca não é ampliada automaticamente. Remova um filtro para ver mais resultados:
      </span>
      <ul className="flex flex-col gap-2">
        {sugestoes.map((a) => {
          const n = contagens[chave(a)];
          return (
            <li key={chave(a)}>
              <button
                type="button"
                onClick={() => aoMudarFiltros(semFiltro(filtros, a))}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-salvia-clara px-4 py-3 text-left hover:bg-salvia"
              >
                <span className="text-[15px] font-semibold text-musgo-escuro">Remover “{a.rotulo}”</span>
                <span className="flex items-center gap-1 text-sm font-semibold text-musgo">
                  {n === undefined ? "…" : `${n} ${n === 1 ? "ONG" : "ONGs"}`}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => aoMudarFiltros(FILTROS_VAZIOS)}
        className="cursor-pointer self-start text-sm font-semibold text-musgo underline underline-offset-2"
      >
        Limpar todos os filtros
      </button>
    </div>
  );
}

const chave = (a: FiltroAtivo) => `${a.campo}:${a.valor}`;
