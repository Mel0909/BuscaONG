'use client'
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { MAX_DETALHE_URGENCIA, PRAZO_PADRAO_DIAS, PRAZOS_URGENCIA_DIAS, prazoRestante } from "@/lib/ong/urgencia";
import { iniciais } from "@/utils/formatters/texto";
import { Dialogo } from "@/components/base/Dialogo";

export type LinhaItem = {
  item: string;
  nome: string;
  livre: boolean;
  urgencia: { detalhe: string | null; ate: string } | null;
};

type Props = {
  itens: LinhaItem[];
  ong: { nome: string; logoUrl: string | null };
  /** suspensa: não dá para marcar urgência */
  bloqueado: boolean;
};

async function chamar(metodo: "POST" | "DELETE", corpo: { item: string; detalhe?: string; dias?: number }) {
  const url = metodo === "DELETE" ? `/api/ongs/minha/urgencias?${new URLSearchParams({ item: corpo.item })}` : "/api/ongs/minha/urgencias";
  const resposta = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: metodo === "POST" ? JSON.stringify(corpo) : undefined,
  });
  if (resposta.ok) return null;
  const body = await resposta.json().catch(() => null);
  return (body?.error?.message as string | undefined) ?? "Não foi possível salvar. Tente de novo.";
}

/** Itens e urgência (O2) e o formulário de marcar urgente (O3). */
export function TabelaUrgencias({ itens, ong, bloqueado }: Props) {
  const router = useRouter();
  const [marcando, setMarcando] = useState<LinhaItem | null>(null);
  const [encerrando, setEncerrando] = useState<string | null>(null);

  async function encerrar(linha: LinhaItem) {
    setEncerrando(linha.item);
    const erro = await chamar("DELETE", { item: linha.item });
    setEncerrando(null);
    if (erro) return toast.error(erro);
    toast.success(`Urgência de “${linha.nome}” encerrada`);
    router.refresh();
  }

  return (
    <>
      <div className="overflow-hidden rounded-[18px] border border-borda-suave bg-papel">
        <div className="hidden grid-cols-[1fr_150px_230px] bg-creme px-5 py-3 text-xs font-bold uppercase tracking-[0.05em] text-tinta-suave md:grid">
          <span>Item</span>
          <span>Tipo</span>
          <span>Urgência</span>
        </div>
        <ul>
          {itens.map((linha) => (
            <li
              key={linha.item}
              className="flex flex-col gap-2 border-t border-borda-suave px-5 py-3.5 first:border-t-0 md:grid md:grid-cols-[1fr_150px_230px] md:items-center md:first:border-t"
            >
              <span className="flex flex-col">
                <span className="text-[15px] font-medium">{linha.nome}</span>
                {linha.urgencia?.detalhe && <span className="text-[13px] text-tinta-suave">{linha.urgencia.detalhe}</span>}
              </span>
              <span className="text-[13px] text-tinta-suave">{linha.livre ? "Escrito por vocês" : "Da lista"}</span>
              {linha.urgencia ? (
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="rounded-md bg-terracota px-2 py-[3px] text-[11px] font-bold tracking-[0.03em] text-papel">URGENTE</span>
                  <span className="text-[13px] text-tinta-suave">{prazoRestante(linha.urgencia.ate)}</span>
                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() => setMarcando(linha)}
                    className="cursor-pointer text-[13px] font-semibold text-musgo underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={bloqueado || encerrando === linha.item}
                    onClick={() => encerrar(linha)}
                    className="cursor-pointer text-[13px] font-semibold text-tinta-suave underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {encerrando === linha.item ? "Encerrando…" : "Encerrar"}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => setMarcando(linha)}
                  className="cursor-pointer self-start justify-self-start rounded-[10px] border border-borda px-3 py-1.5 text-[13px] font-semibold text-terracota-escura hover:border-terracota disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Marcar urgente
                </button>
              )}
            </li>
          ))}
        </ul>
        <a href="#editar-itens" className="block border-t border-borda-suave px-5 py-3.5 text-sm font-semibold text-musgo hover:bg-salvia-clara">
          + Adicionar item
        </a>
      </div>

      {marcando && (
        <MarcarUrgente
          linha={marcando}
          ong={ong}
          aoFechar={() => setMarcando(null)}
          aoSalvar={() => {
            setMarcando(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function MarcarUrgente({
  linha,
  ong,
  aoFechar,
  aoSalvar,
}: {
  linha: LinhaItem;
  ong: Props["ong"];
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [detalhe, setDetalhe] = useState(linha.urgencia?.detalhe ?? "");
  const editando = !!linha.urgencia;
  // null = manter o prazo atual (só ao editar)
  const [dias, setDias] = useState<number | null>(editando ? null : PRAZO_PADRAO_DIAS);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setEnviando(true);
    setErro(null);
    const falha = await chamar("POST", { item: linha.item, detalhe, ...(dias === null ? {} : { dias }) });
    setEnviando(false);
    if (falha) return setErro(falha);
    toast.success(editando ? `Urgência de “${linha.nome}” atualizada` : `“${linha.nome}” marcado como urgente`);
    aoSalvar();
  }

  return (
    <Dialogo
      titulo={editando ? `Urgência de “${linha.nome}”` : `Marcar “${linha.nome}” como urgente`}
      aoFechar={aoFechar}
      largura="largo"
    >
      <div className="grid gap-7 md:grid-cols-[1fr_250px]">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
          className="flex flex-col gap-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between text-[13px] font-semibold">
              Detalhe <span className="font-normal text-tinta-suave">{detalhe.length}/{MAX_DETALHE_URGENCIA}</span>
            </span>
            <textarea
              value={detalhe}
              onChange={(e) => setDetalhe(e.target.value)}
              maxLength={MAX_DETALHE_URGENCIA}
              rows={3}
              placeholder="Ex.: 200 unidades até sexta. Pode entregar na portaria, 8h–18h."
              className="rounded-[13px] border border-borda bg-creme px-[14px] py-3 text-[15px] leading-[1.45] outline-none focus:border-2 focus:border-musgo"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-semibold">Urgente por</legend>
            <div className="flex flex-wrap gap-2">
              {linha.urgencia && (
                <button
                  type="button"
                  aria-pressed={dias === null}
                  onClick={() => setDias(null)}
                  className={cn(
                    "h-10 cursor-pointer rounded-[11px] px-3.5 text-sm",
                    dias === null ? "bg-musgo font-semibold text-papel" : "border border-borda bg-papel font-medium hover:border-musgo"
                  )}
                >
                  Manter ({prazoRestante(linha.urgencia.ate)})
                </button>
              )}
              {PRAZOS_URGENCIA_DIAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dias === d}
                  onClick={() => setDias(d)}
                  className={cn(
                    "h-10 cursor-pointer rounded-[11px] px-3.5 text-sm",
                    dias === d ? "bg-musgo font-semibold text-papel" : "border border-borda bg-papel font-medium hover:border-musgo"
                  )}
                >
                  {d} dias
                </button>
              ))}
            </div>
            <span className="text-[13px] text-tinta-suave">Depois disso o selo sai sozinho. Dá para encerrar antes no painel.</span>
          </fieldset>

          {erro && (
            <p role="alert" className="rounded-[13px] border border-borda px-4 py-3 text-sm font-semibold">
              {erro}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={enviando}
              className="h-[50px] cursor-pointer rounded-[15px] bg-terracota px-[22px] text-[15px] font-semibold text-papel hover:bg-terracota-escura disabled:opacity-60"
            >
              {enviando ? "Salvando…" : editando ? "Salvar" : "Marcar como urgente"}
            </button>
            <button
              type="button"
              onClick={aoFechar}
              className="h-[50px] cursor-pointer rounded-[15px] bg-salvia-clara px-[18px] text-[15px] font-semibold text-musgo hover:bg-salvia"
            >
              Cancelar
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-tinta-suave">Como aparece no mapa</span>
          <div className="flex gap-2.5 rounded-[18px] border border-borda-suave bg-creme p-3">
            <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-salvia font-display text-[15px] font-bold text-musgo">
              {ong.logoUrl ? <Image src={ong.logoUrl} alt="" fill unoptimized className="object-cover" /> : iniciais(ong.nome)}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-semibold">{ong.nome}</span>
              <span className="self-start rounded-md bg-terracota px-2 py-[3px] text-[11px] font-bold uppercase text-papel">
                Urgente · {linha.nome}
              </span>
            </span>
          </div>
          <span className="text-xs leading-[1.45] text-tinta-suave">
            O pin fica terracota e o item aparece em “Urgente agora” na página da ONG.
          </span>
        </div>
      </div>
    </Dialogo>
  );
}
