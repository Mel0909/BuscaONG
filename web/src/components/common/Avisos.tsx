"use client";

import { Toaster } from "react-hot-toast";

// Avisos rápidos das telas: toast.success(...) e toast.error(...) do react-hot-toast aparecem aqui.
// O react-hot-toast aplica o visual por style (inline), então as cores vêm das variáveis dos tokens.
// A paleta não tem cor de erro e terracota é só para urgência (buscaong.md §11): o ícone de erro
// usa tinta, e o de sucesso, musgo.
export function Avisos() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: "var(--color-papel)",
          color: "var(--color-tinta)",
          border: "1px solid var(--color-borda)",
          borderRadius: "14px",
          padding: "10px 14px",
          fontSize: "15px",
          maxWidth: "420px",
        },
        success: { iconTheme: { primary: "var(--color-musgo)", secondary: "var(--color-papel)" } },
        // erro fica mais tempo na tela, para dar tempo de ler o que fazer
        error: { duration: 6000, iconTheme: { primary: "var(--color-tinta)", secondary: "var(--color-papel)" } },
      }}
    />
  );
}
