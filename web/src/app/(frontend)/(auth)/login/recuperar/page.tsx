import type { Metadata } from "next";

import { MolduraAuth } from "../../_components/MolduraAuth";
import { RecuperarSenha } from "./_components/RecuperarSenha";

export const metadata: Metadata = {
  title: "Recuperar a senha · BuscaONG",
};

export default function RecuperarSenhaPage() {
  return (
    <MolduraAuth titulo="Recuperar a senha" subtitulo="Enviamos um código para o e-mail de acesso da ONG.">
      <RecuperarSenha />
    </MolduraAuth>
  );
}
