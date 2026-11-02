'use client'
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { BuscaOngMark } from "@/components/base/brand/BuscaOngLogo";

const SECOES = [
  { href: "/ong/painel", nome: "Início" },
  { href: "/ong/painel/itens", nome: "Itens e urgência" },
  { href: "/ong/painel/perfil", nome: "Perfil público" },
  { href: "/ong/painel/voluntariado", nome: "Voluntariado" },
];

const STATUS = { PUBLICADA: "Perfil publicado", SUSPENSA: "Perfil suspenso" } as const;

type Props = { nome: string; status: keyof typeof STATUS; children: ReactNode };

function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="BuscaONG: ir para o mapa">
      <BuscaOngMark size={30} variant="dark" />
      <span className="font-display text-lg font-bold">BuscaONG</span>
    </Link>
  );
}

/** Moldura do painel da ONG (O2): barra lateral musgo-escuro no computador, abas no topo no celular. */
export function PainelShell({ nome, status, children }: Props) {
  const caminho = usePathname();
  const router = useRouter();
  const ativa = (href: string) => (href === "/ong/painel" ? caminho === href : caminho.startsWith(href));

  async function sair() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const links = SECOES.map((s) => (
    <Link
      key={s.href}
      href={s.href}
      aria-current={ativa(s.href) ? "page" : undefined}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-[11px] px-3 py-2.5 text-[15px] font-medium transition-colors",
        ativa(s.href) ? "bg-musgo font-semibold text-papel" : "text-salvia-apagada hover:text-papel"
      )}
    >
      {s.nome}
    </Link>
  ));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <header className="flex flex-col gap-3 bg-musgo-escuro px-4 pt-4 text-salvia-clara md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Marca />
          <button type="button" onClick={sair} className="flex cursor-pointer items-center gap-1.5 text-sm text-salvia-apagada">
            <LogOut className="size-4" aria-hidden="true" /> Sair
          </button>
        </div>
        <p className="text-sm">
          <span className="font-semibold text-papel">{nome}</span> · <span className="text-salvia-apagada">{STATUS[status]}</span>
        </p>
        <nav aria-label="Seções do painel" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-3">
          {links}
        </nav>
      </header>

      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 bg-musgo-escuro px-4 py-7 text-salvia-clara md:flex">
        <div className="px-2">
          <Marca />
        </div>
        <nav aria-label="Seções do painel" className="flex flex-col gap-0.5">
          {links}
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-papel">{nome}</span>
            <span className="text-xs text-salvia-apagada">{STATUS[status]}</span>
          </div>
          <button
            type="button"
            onClick={sair}
            className="flex cursor-pointer items-center gap-1.5 self-start text-[13px] text-salvia-apagada hover:text-papel"
          >
            <LogOut className="size-4" aria-hidden="true" /> Sair
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-7 md:px-11 md:py-9">{children}</main>
    </div>
  );
}
