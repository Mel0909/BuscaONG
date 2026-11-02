'use client'
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { enviarPasso } from "../_actions/enviarPasso";
import { useModo } from "./modo";

/**
 * Envia um passo e, se der certo, segue para o próximo (no painel, fica na página e avisa).
 * `campos` guarda o erro de cada campo devolvido pela API (ex.: campos["whatsapp.valor"]).
 */
export function useEnvioPasso(secao: string, proximaRota: string) {
  const router = useRouter();
  const modo = useModo();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<Record<string, string>>({});

  async function enviar(corpo: unknown) {
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    setCampos({});

    const resposta = await enviarPasso(secao, corpo);
    if (resposta.ok && modo === "painel") {
      setEnviando(false);
      toast.success("Alterações salvas");
      router.refresh();
      return;
    }
    if (resposta.ok) {
      router.push(proximaRota);
      return; // mantém "Salvando…" até a próxima tela abrir
    }

    setEnviando(false);
    setCampos(resposta.campos);
    // com erro em campos, a mensagem aparece junto do campo; aqui fica só o aviso geral
    setErro(Object.keys(resposta.campos).length > 0 ? "Confira os campos destacados." : resposta.mensagem);
  }

  return { enviando, erro, campos, enviar };
}
