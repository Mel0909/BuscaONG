'use client'
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { chamarAdmin } from "../../_actions/api";
import { CampoMotivo } from "../../_components/FichaOng";
import { estiloBotaoClaro, estiloBotaoEscuro, estiloBotaoPerigo } from "../../_components/ui";

const MOTIVOS_REMOVER = ["Imagem inadequada", "Imagem de outra organização", "Dados pessoais na imagem", "Não é a logo ou foto da ONG"];

type Props = {
  ongId: string;
  ong: string;
  pagina: string;
  tipo: "logo" | "capa";
  chave: string;
  url: string;
  quando: string;
};

/** Uma imagem nova (A5): "Ok" ou "Remover" com motivo. */
export function CartaoImagem({ ongId, ong, pagina, tipo, chave, url, quando }: Props) {
  const router = useRouter();
  const [removendo, setRemovendo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function decidir(acao: "APROVAR" | "REMOVER") {
    if (acao === "REMOVER" && motivo.trim().length < 3) return toast.error("Escolha ou escreva o motivo.");
    setEnviando(true);
    const resposta = await chamarAdmin("PATCH", "imagens", {
      acao,
      ongId,
      tipo,
      chave,
      ...(acao === "REMOVER" ? { motivo } : {}),
    });
    setEnviando(false);
    if (!resposta.ok) {
      toast.error(resposta.mensagem);
      return router.refresh();
    }
    toast.success(acao === "APROVAR" ? "Imagem aprovada" : "Imagem removida e ONG avisada por e-mail");
    router.refresh();
  }

  const nomeTipo = tipo === "logo" ? "Logo" : "Capa";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-cinza-borda bg-branco">
      <div
        className={cn(
          "relative bg-cinza-cabecalho",
          tipo === "logo" ? "mx-auto my-3 size-[140px] overflow-hidden rounded-2xl" : "aspect-[16/7] w-full"
        )}
      >
        <Image src={url} alt={`${nomeTipo} de ${ong}`} fill unoptimized sizes="400px" className="object-cover" />
      </div>
      <div className="flex flex-col gap-2.5 border-t border-cinza-linha px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2 text-[13px]">
          <Link href={pagina} target="_blank" rel="noreferrer" className="truncate font-semibold underline-offset-2 hover:underline">
            {ong}
          </Link>
          <span className="shrink-0 text-xs text-cinza-texto">
            {nomeTipo} · {quando}
          </span>
        </div>

        {removendo ? (
          <>
            <CampoMotivo valor={motivo} aoMudar={setMotivo} sugestoes={MOTIVOS_REMOVER} />
            <div className="flex gap-2">
              <button type="button" disabled={enviando} onClick={() => setRemovendo(false)} className={cn(estiloBotaoClaro, "flex-1")}>
                Cancelar
              </button>
              <button type="button" disabled={enviando} onClick={() => decidir("REMOVER")} className={cn(estiloBotaoPerigo, "flex-1")}>
                {enviando ? "Removendo…" : "Remover imagem"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex gap-2">
            <button type="button" disabled={enviando} onClick={() => decidir("APROVAR")} className={cn(estiloBotaoEscuro, "flex-1")}>
              {enviando ? "Salvando…" : "Ok"}
            </button>
            <button type="button" disabled={enviando} onClick={() => setRemovendo(true)} className={cn(estiloBotaoClaro, "flex-1")}>
              Remover
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
