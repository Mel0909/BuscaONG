'use client'
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import type { MotivoDenuncia } from "@prisma/client";
import { chamarAdmin } from "../../_actions/api";
import { CampoMotivo } from "../../_components/FichaOng";
import { estiloBotaoClaro, estiloBotaoEscuro } from "../../_components/ui";

const MOTIVOS_ARQUIVAR = ["Sem procedência", "ONG já resolveu", "Denúncia repetida", "Informação insuficiente"];
const MOTIVOS_SUSPENDER = ["ONG encerrada", "Pedido de dinheiro ou dados pessoais", "Não é ONG", "Conteúdo ou fotos inadequados", "Violência"];

type Props = { ongId: string; motivo: MotivoDenuncia; ongSuspensa: boolean };

/** A2: arquivar as denúncias (sem agir na ONG) ou suspender a ONG. As duas exigem motivo. */
export function AcoesDenuncia({ ongId, motivo, ongSuspensa }: Props) {
  const router = useRouter();
  const [acao, setAcao] = useState<"arquivar" | "suspender">(ongSuspensa ? "arquivar" : "suspender");
  const [justificativa, setJustificativa] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function executar() {
    if (justificativa.trim().length < 3) return toast.error("Escolha ou escreva o motivo.");
    setEnviando(true);
    const resposta =
      acao === "arquivar"
        ? await chamarAdmin("PATCH", "denuncias", { ongId, motivo, justificativa })
        : await chamarAdmin("PATCH", `ongs/${ongId}`, { status: "SUSPENSA", motivo: justificativa });
    setEnviando(false);
    if (!resposta.ok) return toast.error(resposta.mensagem);
    toast.success(acao === "arquivar" ? "Denúncia arquivada" : "ONG suspensa e avisada por e-mail");
    router.push("/admin/denuncias");
    router.refresh();
  }

  return (
    <div className="mt-auto flex flex-col gap-2.5 border-t border-cinza-linha pt-3">
      {!ongSuspensa && (
        <div className="flex gap-1 rounded-[10px] bg-cinza-cabecalho p-1" role="radiogroup" aria-label="O que fazer">
          {(["suspender", "arquivar"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={acao === a}
              onClick={() => {
                setAcao(a);
                setJustificativa("");
              }}
              className={cn("h-8 flex-1 cursor-pointer rounded-lg text-[13px] font-semibold", acao === a ? "bg-branco shadow-sm" : "text-cinza-texto")}
            >
              {a === "suspender" ? "Suspender ONG" : "Arquivar denúncia"}
            </button>
          ))}
        </div>
      )}
      <CampoMotivo key={acao} valor={justificativa} aoMudar={setJustificativa} sugestoes={acao === "arquivar" ? MOTIVOS_ARQUIVAR : MOTIVOS_SUSPENDER} />
      <button
        type="button"
        disabled={enviando}
        onClick={executar}
        className={cn(acao === "suspender" ? estiloBotaoEscuro : estiloBotaoClaro, "h-10")}
      >
        {enviando ? "Salvando…" : acao === "suspender" ? "Suspender ONG" : "Arquivar denúncia"}
      </button>
      <span className="text-[11px] leading-normal text-cinza-texto">
        {acao === "suspender"
          ? "Tira a ONG do mapa e resolve todas as denúncias abertas dela. Quem denunciou e deixou e-mail é avisado."
          : "Arquiva as denúncias deste motivo, sem mexer na ONG. Fica no registro."}
      </span>
    </div>
  );
}
