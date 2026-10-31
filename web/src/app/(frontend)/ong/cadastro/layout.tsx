import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CadastroShell } from "./_components/CadastroShell";

export const metadata: Metadata = {
  title: "Cadastro da ONG · BuscaONG",
};

export default function CadastroLayout({ children }: { children: ReactNode }) {
  return <CadastroShell>{children}</CadastroShell>;
}
