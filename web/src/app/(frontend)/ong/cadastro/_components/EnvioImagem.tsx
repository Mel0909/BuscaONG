'use client'
import Image from "next/image";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { LADO_MINIMO_LOGO, TAMANHO_MAXIMO_IMAGEM, TIPOS_IMAGEM } from "@/lib/cadastro/limites";
import { enviarPasso } from "../_actions/enviarPasso";
import { ErroCampo, estiloAjuda, estiloRotulo } from "./ui";

export type Imagem = { chave: string; url: string };
type Tipo = "logo" | "capa";

const MB = 1024 * 1024;

async function dimensoes(arquivo: File): Promise<{ largura: number; altura: number }> {
  const bitmap = await createImageBitmap(arquivo);
  const resultado = { largura: bitmap.width, altura: bitmap.height };
  bitmap.close();
  return resultado;
}

/** Confere tipo, tamanho e (na logo) o lado mínimo antes de enviar. */
async function validar(tipo: Tipo, arquivo: File): Promise<string | null> {
  if (!(arquivo.type in TIPOS_IMAGEM)) return "Envie uma imagem JPG, PNG ou WebP.";
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM[tipo]) {
    return `Imagem grande demais: o máximo é ${TAMANHO_MAXIMO_IMAGEM[tipo] / MB} MB.`;
  }
  if (tipo === "logo") {
    try {
      const { largura, altura } = await dimensoes(arquivo);
      if (Math.min(largura, altura) < LADO_MINIMO_LOGO) {
        return `A logo precisa ter pelo menos ${LADO_MINIMO_LOGO} px de lado.`;
      }
    } catch {
      return "Não foi possível abrir a imagem.";
    }
  }
  return null;
}

/**
 * Logo ou capa: pede ao servidor uma URL assinada e envia o arquivo direto ao R2.
 * A chave só fica valendo quando o passo é salvo (botão Continuar).
 */
export function EnvioImagem({
  tipo,
  valor,
  aoMudar,
  disponivel,
}: {
  tipo: Tipo;
  valor: Imagem | null;
  aoMudar: (imagem: Imagem | null) => void;
  disponivel: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const id = `imagem-${tipo}`;

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);

    const invalido = await validar(tipo, arquivo);
    if (invalido) return setErro(invalido);

    setEnviando(true);
    const resposta = await enviarPasso<{ chave: string; url: string; urlEnvio: string }>(
      "imagens",
      { tipo, contentType: arquivo.type, tamanho: arquivo.size },
      "POST"
    );
    if (!resposta.ok) {
      setEnviando(false);
      return setErro(resposta.mensagem);
    }

    try {
      const envio = await fetch(resposta.dados.urlEnvio, {
        method: "PUT",
        headers: { "Content-Type": arquivo.type },
        body: arquivo,
      });
      if (!envio.ok) throw new Error(String(envio.status));
      aoMudar({ chave: resposta.dados.chave, url: resposta.dados.url });
    } catch {
      setErro("Não foi possível enviar a imagem. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const ehLogo = tipo === "logo";
  const textoBotao = enviando ? "Enviando…" : valor ? (ehLogo ? "Trocar logo" : "Trocar foto") : "Enviar";

  return (
    <div className="flex flex-col gap-[7px]">
      <span id={`${id}-rotulo`} className={estiloRotulo}>
        {ehLogo ? "Logo" : "Foto de capa"}
      </span>

      <button
        type="button"
        aria-labelledby={`${id}-rotulo`}
        disabled={!disponivel || enviando}
        onClick={() => input.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden text-[13px] font-semibold text-musgo disabled:cursor-not-allowed",
          ehLogo ? "size-[120px] rounded-[28px]" : "h-[150px] w-full rounded-[18px]",
          valor
            ? "bg-salvia-clara"
            : ehLogo
              ? "border-2 border-dashed border-borda bg-papel"
              : "bg-[repeating-linear-gradient(135deg,var(--color-salvia)_0_14px,var(--color-salvia-clara)_14px_28px)]",
          (!disponivel || enviando) && "opacity-60"
        )}
      >
        {valor ? (
          <Image src={valor.url} alt="" fill unoptimized className="object-cover" />
        ) : (
          <>
            <span className="text-[22px] leading-none">+</span>
            {disponivel ? (enviando ? "Enviando…" : "Enviar") : "Indisponível"}
          </>
        )}
      </button>

      <input
        ref={input}
        type="file"
        accept={Object.keys(TIPOS_IMAGEM).join(",")}
        className="hidden"
        onChange={(e) => {
          void escolher(e.target.files?.[0]);
          e.target.value = ""; // permite escolher o mesmo arquivo de novo
        }}
      />

      {valor && disponivel && (
        <span className="flex gap-4 text-[13px] font-semibold text-musgo">
          <button type="button" onClick={() => input.current?.click()} disabled={enviando} className="cursor-pointer">
            {textoBotao}
          </button>
          <button type="button" onClick={() => aoMudar(null)} disabled={enviando} className="cursor-pointer text-tinta-suave">
            Remover
          </button>
        </span>
      )}

      <span className={estiloAjuda}>
        {!disponivel
          ? "O envio de imagens ainda não está disponível. Dá para adicionar depois, no painel."
          : ehLogo
            ? `Quadrada, mín. ${LADO_MINIMO_LOGO} px. Sem logo, usamos as iniciais.`
            : "Até 5 MB. Evitem mostrar o rosto de crianças."}
      </span>
      <ErroCampo id={`${id}-erro`}>{erro ?? undefined}</ErroCampo>
    </div>
  );
}
