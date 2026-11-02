'use client'
import toast from "react-hot-toast";

import { Link2 } from "lucide-react";

/** Copia o link completo da página da ONG (para divulgar em redes e no WhatsApp). */
export function CopiarLink({ caminho }: { caminho: string }) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${caminho}`);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar. Copie da barra de endereço da página.");
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="flex h-10 cursor-pointer items-center gap-1.5 rounded-[12px] bg-salvia-clara px-4 text-sm font-semibold text-musgo hover:bg-salvia"
    >
      <Link2 className="size-4" aria-hidden="true" /> Copiar link
    </button>
  );
}
