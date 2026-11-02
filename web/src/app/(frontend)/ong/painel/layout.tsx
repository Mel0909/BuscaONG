import type { Metadata } from "next";
import type { ReactNode } from "react";

import { capitalizarNome } from "@/utils/formatters/receita";
import { ModoPainel } from "../cadastro/_components/modo";
import { PainelShell } from "./_components/PainelShell";
import { carregarPainel } from "./_utils/carregarPainel";

export const metadata: Metadata = {
  title: "Painel da ONG · BuscaONG",
};

export default async function PainelLayout({ children }: { children: ReactNode }) {
  const { ong } = await carregarPainel();
  const status = ong.status === "SUSPENSA" ? "SUSPENSA" : "PUBLICADA";

  return (
    <PainelShell nome={ong.nomePublico ?? capitalizarNome(ong.razaoSocial)} status={status}>
      <ModoPainel>{children}</ModoPainel>
    </PainelShell>
  );
}
