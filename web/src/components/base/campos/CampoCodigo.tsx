'use client'
import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

type Props = {
  tamanho?: number;
  valor: string;
  aoMudar: (valor: string) => void;
  desabilitado?: boolean;
};

// código de verificação: um campo por dígito, avança sozinho e aceita colar o código inteiro
export function CampoCodigo({ tamanho = 6, valor, aoMudar, desabilitado }: Props) {
  const campos = useRef<(HTMLInputElement | null)[]>([]);
  const digitos = Array.from({ length: tamanho }, (_, i) => valor[i] ?? "");

  function focar(i: number) {
    campos.current[Math.max(0, Math.min(tamanho - 1, i))]?.focus();
  }

  function mudar(i: number, texto: string) {
    const novos = texto.replace(/\D/g, "");
    if (!novos) return;
    const atualizado = [...digitos];
    // digitar num campo preenchido troca o dígito; vários dígitos (autocompletar) preenchem em sequência
    [...novos].slice(0, tamanho - i).forEach((d, k) => (atualizado[i + k] = d));
    aoMudar(atualizado.join("").slice(0, tamanho));
    focar(i + novos.length);
  }

  function teclar(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const atualizado = [...digitos];
      if (atualizado[i]) {
        atualizado[i] = "";
      } else if (i > 0) {
        atualizado[i - 1] = "";
        focar(i - 1);
      }
      aoMudar(atualizado.join(""));
    } else if (e.key === "ArrowLeft") {
      focar(i - 1);
    } else if (e.key === "ArrowRight") {
      focar(i + 1);
    }
  }

  function colar(e: ClipboardEvent<HTMLInputElement>) {
    const texto = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, tamanho);
    if (!texto) return;
    e.preventDefault();
    aoMudar(texto);
    focar(texto.length);
  }

  return (
    <div className="flex gap-2" role="group" aria-label={`Código de ${tamanho} dígitos`}>
      {digitos.map((digito, i) => (
        <input
          key={i}
          ref={(el) => {
            campos.current[i] = el;
          }}
          value={digito}
          onChange={(e) => mudar(i, e.target.value)}
          onKeyDown={(e) => teclar(i, e)}
          onPaste={colar}
          onFocus={(e) => e.target.select()}
          disabled={desabilitado}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Dígito ${i + 1}`}
          className="h-14 w-12 rounded-xl border border-borda bg-creme text-center font-mono text-[22px] font-semibold outline-none focus:border-2 focus:border-musgo disabled:opacity-60"
        />
      ))}
    </div>
  );
}
