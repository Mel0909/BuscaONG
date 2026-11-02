import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { toErrorMessage } from "../toErrorMessage";

export type SessaoAdmin = { id: string; email: string };

/** Sessão de um admin (perfil ADMIN). Devolve 401 sem login e 403 para outro perfil. */
export async function exigirSessaoAdmin(request: NextRequest): Promise<SessaoAdmin | NextResponse> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json(toErrorMessage("Faça login para continuar"), { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json(toErrorMessage("Acesso negado - Permissões insuficientes"), { status: 403 });
  }

  return { id: session.user.id, email: session.user.email };
}
