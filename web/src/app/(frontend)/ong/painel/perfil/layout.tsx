import type { ReactNode } from "react";

import { TituloPainel } from "../_components/ui";
import { SubnavPerfil } from "./_components/SubnavPerfil";

// painel: perfil público (nome, fotos, contatos e endereço), em três partes
export default function PainelPerfilLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[1040px] flex-col gap-6">
      <TituloPainel titulo="Perfil público">O que aparece na página da ONG. As mudanças valem na hora.</TituloPainel>
      <SubnavPerfil />
      {children}
    </div>
  );
}
