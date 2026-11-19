'use client'
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const SECOES = [
  { href: "/admin/ongs", nome: "ONGs" },
  { href: "/admin/denuncias", nome: "Denúncias" },
  { href: "/admin/imagens", nome: "Imagens" },
  { href: "/admin/registro", nome: "Registro de ações" },
  { href: "/admin/listas", nome: "Listas" },
];

type Props = { email: string; denunciasAbertas: number; imagensParaRevisar: number };

/** Barra do admin (A1 a A5): escura, com as seções, as denúncias abertas e as imagens a revisar. */
export function BarraAdmin({ email, denunciasAbertas, imagensParaRevisar }: Props) {
  const caminho = usePathname();
  const router = useRouter();

  async function sair() {
    await authClient.signOut();
    router.push("/admin");
    router.refresh();
  }

  return (
    <header className="flex flex-wrap items-center gap-x-7 gap-y-2 bg-grafite px-4 py-2.5 text-cinza-linha md:h-[52px] md:flex-nowrap md:px-[22px] md:py-0">
      <Link href="/admin/ongs" className="font-display text-[15px] font-bold">
        BuscaONG <span className="font-mono text-xs font-medium text-grafite-texto">/admin</span>
      </Link>
      <nav aria-label="Seções do admin" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto text-sm font-medium md:order-none md:w-auto">
        {SECOES.map((s) => {
          const ativa = caminho.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={ativa ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-[7px]",
                ativa ? "bg-grafite-ativo text-branco" : "text-grafite-texto hover:text-branco"
              )}
            >
              {s.nome}
              {s.href === "/admin/denuncias" && denunciasAbertas > 0 && (
                <span className="rounded-md bg-terracota px-[5px] text-[11px] font-bold text-branco">{denunciasAbertas}</span>
              )}
              {s.href === "/admin/imagens" && imagensParaRevisar > 0 && (
                <span className="rounded-md bg-cinza-linha px-[5px] text-[11px] font-bold text-grafite">{imagensParaRevisar}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-4 text-[13px]">
        <span className="hidden text-grafite-texto sm:inline">{email}</span>
        <button type="button" onClick={sair} className="cursor-pointer font-semibold text-cinza-linha hover:text-branco">
          Sair
        </button>
      </div>
    </header>
  );
}
