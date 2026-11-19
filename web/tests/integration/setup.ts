import { vi } from "vitest";

import { mockAuth } from "./mocks/auth";

// Roda antes de cada arquivo de teste (vitest.config.mts, setupFiles).

// As rotas e páginas importam @/auth, que monta o better-auth com o banco de verdade. Nos testes, a
// sessão vem do mock (entrarComo("ONG" | "ADMIN" | null)). Quem precisa do better-auth real, como
// tests/integration/auth, desfaz com vi.unmock("@/auth").
vi.mock("@/auth", () => ({ auth: mockAuth }));

// o plugin de cookies do Next só funciona dentro de uma requisição do Next
vi.mock("better-auth/next-js", () => ({ nextCookies: () => ({}) }));
