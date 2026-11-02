import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";
import { buscarOngDoUsuario } from "@/backend/services/ongs";

/**
 * Para as páginas do painel (Server Components): exige a conta da ONG logada e devolve a ONG.
 * Sem login, vai para o login; cadastro ainda não publicado, para o passo em que parou.
 * Com `cache`, o layout e a página fazem uma consulta só por requisição.
 */
export const carregarPainel = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  if (session.role === "ADMIN") redirect("/admin");
  if (session.role !== "ONG") redirect("/");

  const ong = await buscarOngDoUsuario(session.user.id);
  if (!ong) redirect("/ong/cadastro");
  if (ong.status === "RASCUNHO") redirect("/ong/cadastro/retomar");

  return { ong, emailAcesso: session.user.email };
});
