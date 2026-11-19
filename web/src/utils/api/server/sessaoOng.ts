import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { erroJson } from "./respostas";

export type SessaoOng = { userId: string; email: string };

/**
 * Sessão de uma conta de ONG (perfil ONG). Devolve 401 sem login e 403 para outro perfil.
 * Com `requireEmailVerification`, só existe sessão depois de o e-mail ser confirmado.
 */
export async function exigirSessaoOng(request: NextRequest): Promise<SessaoOng | NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return erroJson(401, "Faça login para continuar");
  }
  if (session.role !== "ONG") {
    return erroJson(403, "Acesso negado - Permissões insuficientes");
  }

  return { userId: session.user.id, email: session.user.email };
}
