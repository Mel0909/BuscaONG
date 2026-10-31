import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { buscarOngDoUsuario } from "@/backend/services/ongs";
import { rotaDoPasso } from "../_components/passos";

// sem tela: leva a ONG logada ao passo em que parou (ou ao 8, se já publicou)
export default async function CadastroRetomarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/ong/cadastro/continuar");
  if (session.role !== "ONG") redirect("/");

  const ong = await buscarOngDoUsuario(session.user.id);
  if (!ong) redirect("/ong/cadastro");

  redirect(rotaDoPasso(ong.status === "RASCUNHO" ? ong.passoAtual : 8));
}
