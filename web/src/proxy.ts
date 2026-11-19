import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Proxy do Next: roda antes das páginas da área do admin e do painel da ONG.
// Só faz a checagem otimista, como recomendam as documentações do Next e do better-auth: sem o
// cookie de sessão, manda para o login certo antes de renderizar. Não consulta o banco nem
// importa o better-auth inteiro. A checagem de verdade (sessão válida e perfil) fica nas páginas
// (carregarAdmin, carregarPainel) e nas rotas da API (exigirSessaoAdmin, exigirSessaoOng), porque
// um cookie presente pode estar vencido ou ser de outro perfil.

export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const login = pathname.startsWith("/admin/") ? "/admin" : "/login";
  return NextResponse.redirect(new URL(login, request.url));
}

export const config = {
  matcher: ["/admin/:path+", "/ong/painel/:path*"],
};
