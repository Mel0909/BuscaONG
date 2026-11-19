import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { MolduraAuth } from "../_components/MolduraAuth";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: "Entrar · BuscaONG",
};

// login da ONG (o admin entra por /admin)
export default async function LoginPage() {
  // quem já entrou vai para a própria área (o painel leva o cadastro não terminado ao passo em que parou)
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role === "ADMIN") redirect("/admin/ongs");
  if (session?.user.role === "ONG") redirect("/ong/painel");

  return (
    <MolduraAuth titulo="Entrar no painel" subtitulo="Para ONGs já cadastradas no BuscaONG.">
      <LoginForm />
    </MolduraAuth>
  );
}
