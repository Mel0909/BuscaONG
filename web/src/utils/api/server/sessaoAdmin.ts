import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { erroJson } from "./respostas";

export type SessaoAdmin = { id: string; email: string };

/** Sessão de um admin (perfil ADMIN). Devolve 401 sem login e 403 para outro perfil. */
export async function exigirSessaoAdmin(request: NextRequest): Promise<SessaoAdmin | NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return erroJson(401, "Faça login para continuar");
  }
  if (session.user.role !== "ADMIN") {
    return erroJson(403, "Acesso negado - Permissões insuficientes");
  }

  return { id: session.user.id, email: session.user.email };
}
