import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/auth";

/** Para as páginas do admin (Server Components): exige a sessão de um admin. */
export const carregarAdmin = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/admin");
  if (session.role !== "ADMIN") redirect("/");
  return { id: session.user.id, email: session.user.email };
});

/** Lê um parâmetro de busca da URL (o Next entrega string, lista ou nada). */
export const parametro = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor) ?? "";
