'use client'
import { useEffect, useId, useRef, useState } from "react";

import type { Ponto } from "@/lib/mapa/geo";
import { MapPin, Search, X } from "lucide-react";
import { buscarLugares, buscarOngsPorNome, type LugarEncontrado, type OngEncontrada } from "../_actions/api";

type Props = {
  perto: Ponto; // os lugares mais próximos daqui aparecem primeiro
  aoEscolherOng: (ong: OngEncontrada) => void;
  aoEscolherLugar: (lugar: LugarEncontrado) => void;
};

const ESPERA_MS = 300;

/** "ONG ou bairro": nomes de ONGs (nosso banco) e bairros/cidades (Mapbox), num só campo. */
export function CampoBusca({ perto, aoEscolherOng, aoEscolherLugar }: Props) {
  const idLista = useId();
  const caixa = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ongs, setOngs] = useState<OngEncontrada[]>([]);
  const [lugares, setLugares] = useState<LugarEncontrado[]>([]);

  const termo = texto.trim();
  useEffect(() => {
    if (termo.length < 2) return;
    const controle = new AbortController();
    const timer = setTimeout(() => {
      // cada fonte aparece quando responder; uma falhar não esconde a outra
      buscarOngsPorNome(termo, controle.signal).then(setOngs).catch(() => {});
      if (termo.length >= 3) buscarLugares(termo, perto, controle.signal).then(setLugares).catch(() => {});
    }, ESPERA_MS);
    return () => {
      clearTimeout(timer);
      controle.abort();
    };
    // a posição só muda a ordem dos lugares; não precisa refazer a busca quando o mapa anda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);

  // fecha a lista ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    document.addEventListener("pointerdown", fora);
    return () => document.removeEventListener("pointerdown", fora);
  }, [aberto]);

  const mostrarOngs = termo.length >= 2 ? ongs : [];
  const mostrarLugares = termo.length >= 3 ? lugares : [];
  const temResultado = mostrarOngs.length + mostrarLugares.length > 0;

  function fechar(limpar: boolean) {
    setAberto(false);
    if (limpar) setTexto("");
  }

  return (
    <div ref={caixa} className="relative min-w-0 flex-1">
      <div className="flex h-12 items-center gap-2 rounded-[15px] border border-borda bg-papel px-3 shadow-[0_4px_14px_rgba(31,43,36,.08)] focus-within:border-2 focus-within:border-musgo">
        <Search className="size-[18px] shrink-0 text-tinta" aria-hidden="true" />
        <input
          type="search"
          role="combobox"
          aria-expanded={aberto && temResultado}
          aria-controls={idLista}
          aria-label="Buscar ONG ou bairro"
          placeholder="ONG ou bairro"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={(e) => e.key === "Escape" && fechar(false)}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-tinta-suave [&::-webkit-search-cancel-button]:hidden"
        />
        {texto && (
          <button type="button" aria-label="Limpar busca" onClick={() => fechar(true)} className="cursor-pointer text-tinta-suave">
            <X className="size-[18px]" />
          </button>
        )}
      </div>

      {aberto && temResultado && (
        <ul
          id={idLista}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+6px)] z-40 max-h-[60vh] overflow-auto rounded-[16px] border border-borda-suave bg-papel py-2 shadow-[0_12px_30px_rgba(31,43,36,.18)]"
        >
          {mostrarOngs.length > 0 && <li className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-[0.06em] text-tinta-suave">ONGs</li>}
          {mostrarOngs.map((ong) => (
            <li key={ong.id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => {
                  aoEscolherOng(ong);
                  setTexto(ong.nome);
                  fechar(false);
                }}
                className="flex w-full cursor-pointer flex-col px-4 py-2 text-left hover:bg-salvia-clara"
              >
                <span className="text-[15px] font-semibold">{ong.nome}</span>
                {ong.local && <span className="text-[13px] text-tinta-suave">{ong.local}</span>}
              </button>
            </li>
          ))}
          {mostrarLugares.length > 0 && (
            <li className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-[0.06em] text-tinta-suave">Lugares</li>
          )}
          {mostrarLugares.map((lugar) => (
            <li key={lugar.id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => {
                  aoEscolherLugar(lugar);
                  setTexto(lugar.nome);
                  fechar(false);
                }}
                className="flex w-full cursor-pointer items-start gap-2 px-4 py-2 text-left hover:bg-salvia-clara"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-musgo" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">{lugar.nome}</span>
                  {lugar.detalhe && <span className="text-[13px] text-tinta-suave">{lugar.detalhe}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
