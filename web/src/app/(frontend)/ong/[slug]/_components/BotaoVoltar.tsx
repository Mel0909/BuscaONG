'use client'
import { useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";

/** Volta para o mapa como estava (histórico); quem abriu o link direto vai para o início. */
export function BotaoVoltar() {
  const router = useRouter();

  function voltar() {
    const veioDoSite = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (veioDoSite && window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <button
      type="button"
      onClick={voltar}
      aria-label="Voltar ao mapa"
      className="absolute left-4 top-4 z-10 flex size-10 cursor-pointer items-center justify-center rounded-[13px] bg-papel text-tinta shadow-[0_2px_8px_rgba(31,43,36,.12)] hover:bg-salvia-clara"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
