import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { buscarOngDoUsuario } from "@/backend/services/ongs";
import { rotaDoPasso } from "../_components/passos";

/**
 * Para as páginas dos passos 3 a 8 (Server Components): exige a conta da ONG logada e
 * devolve a ONG. Sem login, leva à tela de continuar o cadastro (e-mail e senha). Quem tenta pular um passo volta para o primeiro que falta;
 * depois de publicado, só o passo 8 (que mostra o perfil publicado) abre.
 */
export async function carregarPasso(passo: number) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/ong/cadastro/continuar");
  if (session.user.role !== "ONG") redirect("/");

  const ong = await buscarOngDoUsuario(session.user.id);
  if (!ong) redirect("/ong/cadastro");

  if (ong.status !== "RASCUNHO" && passo !== 8) redirect(rotaDoPasso(8));
  if (passo > ong.passoAtual) redirect(rotaDoPasso(ong.passoAtual));

  return { ong, emailAcesso: session.user.email };
}
