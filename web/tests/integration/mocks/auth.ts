import { vi } from "vitest";
import type { Role } from "@prisma/client";

// Sessão falsa para os testes de rota (o setup.ts troca o @/auth por este mock).
// entrarComo("ONG" | "ADMIN") simula uma conta logada com esse perfil; entrarComo(null), ninguém.
// O formato é o de auth.api.getSession: o perfil vem em user.role (additionalFields do better-auth).

export const USUARIO_DE_TESTE = { id: "test-user-id", email: "test@example.com", name: "Test User" };

type Sessao = {
  user: typeof USUARIO_DE_TESTE & { role: Role };
  session: { id: string; userId: string; token: string; expiresAt: Date };
};

let sessao: Sessao | null = null;

export function entrarComo(perfil: Role | null) {
  sessao = perfil && {
    user: { ...USUARIO_DE_TESTE, role: perfil },
    session: { id: "test-session-id", userId: USUARIO_DE_TESTE.id, token: "test-token", expiresAt: new Date(Date.now() + 86_400_000) },
  };
}

export const mockAuth = {
  api: {
    // sem sessão, o better-auth devolve null
    getSession: vi.fn(async () => sessao),
  },
};
