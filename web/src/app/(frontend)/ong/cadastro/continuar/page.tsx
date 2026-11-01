import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PassoContinuar } from "../_components/PassoContinuar";

// quem começou o cadastro, saiu e voltou: entra com o e-mail e a senha criados no passo 2
export default async function CadastroContinuarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user && session.role === "ONG") redirect("/ong/cadastro/retomar");

  return <PassoContinuar />;
}
