'use client'
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import type { SugestaoItemLivre } from "@/backend/services/admin";
import { chamarAdmin } from "../../_actions/api";
import { estiloBotaoClaro, estiloBotaoEscuro } from "../../_components/ui";

/**
 * A4: itens que as ONGs escreveram à mão. Adicionar ou unificar passa as ONGs para o item da
 * lista, e o filtro do mapa passa a encontrá-las. "Manter" tira o item das sugestões.
 */
export function SugestoesItensLivres({ sugestoes }: { sugestoes: SugestaoItemLivre[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function decidir(s: SugestaoItemLivre, corpo: Record<string, string>, sucesso: string) {
    setOcupado(s.chave);
    const resposta = await chamarAdmin("POST", "itens-livres", { chave: s.chave, ...corpo });
    setOcupado(null);
    if (!resposta.ok) return toast.error(resposta.mensagem);
    toast.success(sucesso);
    router.refresh();
  }

  if (sugestoes.length === 0) {
    return <p className="text-[13px] text-cinza-texto">Nenhum item escrito à mão para revisar.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {sugestoes.map((s) => (
        <li key={s.chave} className={cn("flex flex-col gap-2 rounded-[10px] border border-cinza-linha p-3", ocupado === s.chave && "opacity-50")}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold">{s.nome}</span>
            <span className="shrink-0 text-xs text-cinza-texto">
              {s.ongs} {s.ongs === 1 ? "ONG" : "ONGs"}
            </span>
          </div>
          {s.parecido && <span className="text-xs text-cinza-texto">Parecido com “{s.parecido.nome}”, já na lista</span>}
          <div className="flex flex-wrap gap-2">
            {s.parecido ? (
              <button
                type="button"
                disabled={!!ocupado}
                onClick={() => decidir(s, { acao: "UNIFICAR", destinoId: s.parecido!.id }, `Unificado com “${s.parecido!.nome}”`)}
                className={cn(estiloBotaoEscuro, "h-8 text-xs")}
              >
                Unificar com “{s.parecido.nome}”
              </button>
            ) : (
              <button
                type="button"
                disabled={!!ocupado}
                onClick={() => decidir(s, { acao: "ADICIONAR" }, `“${s.nome}” entrou na lista`)}
                className={cn(estiloBotaoEscuro, "h-8 text-xs")}
              >
                Adicionar à lista
              </button>
            )}
            <button
              type="button"
              disabled={!!ocupado}
              onClick={() => decidir(s, { acao: "MANTER" }, "Mantido como texto livre")}
              className={cn(estiloBotaoClaro, "h-8 text-xs")}
            >
              Manter como texto livre
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
