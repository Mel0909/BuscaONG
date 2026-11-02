import type { Metadata } from "next";
import type { ReactNode } from "react";

import { contarFila } from "@/backend/services/denuncias";
import { BarraAdmin } from "./_components/BarraAdmin";
import { carregarAdmin } from "./_utils/carregarAdmin";

export const metadata: Metadata = {
  title: "Admin · BuscaONG",
};

// área admin: visual neutro e denso, sem o creme do site público (protótipo A1 a A4)
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await carregarAdmin();
  const fila = await contarFila();

  return (
    <div className="flex min-h-dvh flex-col bg-cinza-fundo text-tinta">
      <BarraAdmin email={admin.email} denunciasAbertas={fila.ABERTA} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
