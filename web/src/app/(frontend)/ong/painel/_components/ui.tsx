import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Peças visuais comuns às páginas do painel (O2).

export function TituloPainel({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-display text-[26px] font-semibold tracking-[-0.015em] md:text-[30px]">{titulo}</h1>
      {children && <p className="max-w-[720px] text-[15px] leading-normal text-tinta-suave">{children}</p>}
    </div>
  );
}

export function TituloSecao({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-tinta-suave">{children}</h2>;
}

export function Caixa({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[18px] border border-borda-suave bg-papel", className)}>{children}</div>;
}
