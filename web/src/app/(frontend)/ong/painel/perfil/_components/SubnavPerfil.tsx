'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const PARTES = [
  { href: "/ong/painel/perfil", nome: "Apresentação" },
  { href: "/ong/painel/perfil/contatos", nome: "Contatos" },
  { href: "/ong/painel/perfil/localizacao", nome: "Localização" },
];

/** Partes do perfil público, cada uma com o formulário do passo correspondente do cadastro. */
export function SubnavPerfil() {
  const caminho = usePathname();
  return (
    <nav aria-label="Partes do perfil" className="flex gap-1 overflow-x-auto border-b border-borda-suave">
      {PARTES.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={caminho === p.href ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[15px] font-medium",
            caminho === p.href ? "border-musgo font-semibold text-musgo" : "border-transparent text-tinta-suave hover:text-tinta"
          )}
        >
          {p.nome}
        </Link>
      ))}
    </nav>
  );
}
