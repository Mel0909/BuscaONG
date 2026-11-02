import type { Metadata } from "next";

import { LoginAdmin } from "./_components/LoginAdmin";

export const metadata: Metadata = {
  title: "Admin · BuscaONG",
};

// login da equipe (o proxy leva quem já é admin para /admin/ongs). Contas de admin são criadas
// pelo terminal: pnpm admin:criar
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cinza-fundo px-4">
      <div className="flex w-full max-w-[380px] flex-col gap-6 rounded-2xl border border-cinza-borda bg-branco p-7">
        <div className="flex flex-col gap-1">
          <span className="font-display text-lg font-bold">
            BuscaONG <span className="font-mono text-xs font-medium text-cinza-texto">/admin</span>
          </span>
          <span className="text-sm text-cinza-texto">Acesso da equipe.</span>
        </div>
        <LoginAdmin />
      </div>
    </main>
  );
}
