'use client'
import { temFiltroDeItem, temFiltroDeVoluntariado, type Filtros } from "@/lib/mapa/filtros";
import { dentroDoBbox, type Bbox } from "@/lib/mapa/geo";
import { CartaoResultado } from "./CartaoResultado";
import { SemResultados } from "./SemResultados";
import type { OngNaLista, OpcoesFiltro, Referencia, ResultadoLista } from "./tipos";

type Props = {
  lista: ResultadoLista | null; // null = carregando a primeira vez
  erro: boolean;
  referencia: Referencia;
  raioKm: number;
  bbox: Bbox | null;
  filtros: Filtros;
  opcoes: OpcoesFiltro;
  selecionada: string | null;
  aoEscolher: (ong: OngNaLista) => void;
  aoMudarFiltros: (filtros: Filtros) => void;
};

function titulo(total: number, referencia: Referencia, comFiltros: boolean) {
  const ongs = `${total} ${total === 1 ? "ONG" : "ONGs"}`;
  if (comFiltros) return `${ongs} com seus filtros`;
  if (referencia.origem === "pessoa") return `${ongs} perto de você`;
  if (referencia.origem === "lugar" && referencia.nome) return `${ongs} perto de ${referencia.nome}`;
  return `${ongs} nesta região`;
}

/**
 * Lista (P1/P3): das mais próximas para as mais distantes. Não depende da área do mapa,
 * mas separa as que estão fora dela ("toque para centralizar").
 */
export function ListaOngs({ lista, erro, referencia, raioKm, bbox, filtros, opcoes, selecionada, aoEscolher, aoMudarFiltros }: Props) {
  const comItem = temFiltroDeItem(filtros);
  const comHorario = temFiltroDeVoluntariado(filtros);
  const comFiltros = comItem || comHorario || filtros.causas.length > 0;

  if (erro && !lista) {
    return <p className="p-2 text-sm text-tinta-suave">Não foi possível carregar as ONGs agora. Tente de novo em instantes.</p>;
  }
  if (!lista) {
    return <p className="p-2 text-sm text-tinta-suave">Procurando ONGs por perto…</p>;
  }

  const naArea = bbox ? lista.ongs.filter((o) => dentroDoBbox(o, bbox)) : lista.ongs;
  const foraDaArea = bbox ? lista.ongs.filter((o) => !dentroDoBbox(o, bbox)) : [];

  const de = `${referencia.ponto.latitude.toFixed(5)},${referencia.ponto.longitude.toFixed(5)}`;
  const cartao = (ong: OngNaLista) => (
    <li key={ong.id}>
      <CartaoResultado
        ong={ong}
        comFiltroDeItem={comItem}
        comFiltroDeHorario={comHorario}
        selecionada={selecionada === ong.id}
        de={de}
        aoEscolher={() => aoEscolher(ong)}
      />
    </li>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col">
          <h2 className="font-display text-xl font-semibold tracking-[-0.01em]" aria-live="polite">
            {titulo(lista.total, referencia, comFiltros)}
          </h2>
          {bbox && lista.total > 0 && (
            <span className="text-[13px] text-tinta-suave">{naArea.length} na área do mapa</span>
          )}
        </div>
        {lista.total > 0 && <span className="shrink-0 text-[13px] font-medium text-tinta-suave">por distância</span>}
      </div>

      {lista.total === 0 ? (
        <SemResultados
          filtros={filtros}
          opcoes={opcoes}
          referencia={referencia.ponto}
          raioKm={raioKm}
          aoMudarFiltros={aoMudarFiltros}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">{naArea.map(cartao)}</ul>
          {foraDaArea.length > 0 && (
            <>
              <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-tinta-suave">
                <span className="h-px flex-1 bg-borda-suave" />
                Fora da área do mapa · toque para centralizar
                <span className="h-px flex-1 bg-borda-suave" />
              </div>
              <ul className="flex flex-col gap-2.5">{foraDaArea.map(cartao)}</ul>
            </>
          )}
          {lista.total > lista.ongs.length && (
            <p className="text-center text-xs text-tinta-suave">
              Mostrando as {lista.ongs.length} mais próximas de {lista.total}. Use os filtros para refinar.
            </p>
          )}
        </>
      )}
    </div>
  );
}
