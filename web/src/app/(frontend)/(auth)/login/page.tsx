import type { Metadata } from "next";

import { MolduraAuth } from "../_components/MolduraAuth";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: "Entrar · BuscaONG",
};

// login da ONG (o admin entra por /admin)
export default function LoginPage() {
  return (
    <MolduraAuth titulo="Entrar no painel" subtitulo="Para ONGs já cadastradas no BuscaONG.">
      <LoginForm />
    </MolduraAuth>
  );
}
