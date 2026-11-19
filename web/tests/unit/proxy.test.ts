import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

import { config, proxy } from "@/proxy";

const requisicao = (caminho: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${caminho}`, { headers: cookie ? { cookie } : {} });

const roda = (caminho: string) => unstable_doesMiddlewareMatch({ config, url: caminho });

describe("proxy", () => {
  it("só roda na área do admin (não no login dele) e no painel da ONG", () => {
    expect(roda("/admin/ongs")).toBe(true);
    expect(roda("/admin/denuncias/abc")).toBe(true);
    expect(roda("/ong/painel")).toBe(true);
    expect(roda("/ong/painel/itens")).toBe(true);

    expect(roda("/admin")).toBe(false);
    expect(roda("/login")).toBe(false);
    expect(roda("/")).toBe(false);
    expect(roda("/ong/casa-lar")).toBe(false);
    expect(roda("/ong/cadastro")).toBe(false);
    expect(roda("/api/admin/acoes")).toBe(false);
  });

  it("sem cookie de sessão, manda para o login certo", () => {
    expect(getRedirectUrl(proxy(requisicao("/admin/ongs")))).toBe("http://localhost:3000/admin");
    expect(getRedirectUrl(proxy(requisicao("/ong/painel/itens")))).toBe("http://localhost:3000/login");
    // outro cookie qualquer não conta como sessão
    expect(getRedirectUrl(proxy(requisicao("/ong/painel", "tema=escuro")))).toBe("http://localhost:3000/login");
  });

  it("com o cookie de sessão (com ou sem o prefixo __Secure- de produção), deixa a página decidir", () => {
    expect(getRedirectUrl(proxy(requisicao("/admin/ongs", "better-auth.session_token=abc")))).toBeNull();
    expect(getRedirectUrl(proxy(requisicao("/ong/painel", "__Secure-better-auth.session_token=abc")))).toBeNull();
  });
});
