'use client'
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Peças visuais comuns aos passos do cadastro (protótipo O1).

export const estiloCampo =
  "h-[52px] w-full rounded-[14px] border border-borda bg-papel px-4 text-base outline-none focus:border-2 focus:border-musgo disabled:opacity-60";
export const estiloAreaTexto =
  "w-full rounded-[13px] border border-borda bg-papel px-[14px] py-3 text-[15px] leading-normal outline-none focus:border-2 focus:border-musgo";
export const estiloBotaoPrimario =
  "h-[50px] cursor-pointer rounded-[15px] bg-musgo px-7 text-base font-semibold text-papel transition-colors hover:bg-musgo-escuro disabled:cursor-not-allowed disabled:opacity-60";
export const estiloBotaoSecundario =
  "flex h-[50px] cursor-pointer items-center rounded-[15px] bg-salvia-clara px-[22px] text-[15px] font-semibold text-musgo transition-colors hover:bg-salvia";
export const estiloRotulo = "text-sm font-semibold";
export const estiloAjuda = "text-[13px] text-tinta-suave";
export const estiloTituloSecao = "text-xs font-bold uppercase tracking-[0.06em] text-tinta-suave";
export const estiloAviso = "rounded-[14px] bg-salvia-clara px-4 py-3 text-sm leading-normal text-musgo-escuro";

export function CabecalhoPasso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex max-w-[820px] flex-col gap-2">
      <h1 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[34px]">
        {titulo}
      </h1>
      <p className="text-pretty text-base leading-normal text-tinta-suave">{children}</p>
    </div>
  );
}

/** Barra de baixo: Voltar (se houver para onde) e o botão de envio do formulário. */
export function RodapePasso({
  voltar,
  enviando,
  desabilitado,
  rotulo = "Continuar",
}: {
  voltar?: string;
  enviando: boolean;
  desabilitado?: boolean;
  rotulo?: string;
}) {
  return (
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-borda-suave pt-[18px]">
      {voltar ? (
        <Link href={voltar} className={estiloBotaoSecundario}>
          Voltar
        </Link>
      ) : (
        <span />
      )}
      <button type="submit" disabled={enviando || desabilitado} className={estiloBotaoPrimario}>
        {enviando ? "Salvando…" : rotulo}
      </button>
    </div>
  );
}

/** Formulário de um passo: ocupa a altura da tela para o rodapé ficar embaixo. */
export function FormularioPasso({ aoEnviar, children }: { aoEnviar: () => void; children: ReactNode }) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        aoEnviar();
      }}
      className="flex min-h-[calc(100vh-7rem)] flex-col gap-6"
    >
      {children}
    </form>
  );
}

export function MensagemErro({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-[14px] border border-borda bg-papel px-4 py-3 text-[15px] leading-normal">
      {children}
    </div>
  );
}

/** Erro de um campo, vindo da API (borda escura e texto neutro: terracota é só urgência). */
export function ErroCampo({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <span id={id} className="text-[13px] font-semibold text-tinta">
      {children}
    </span>
  );
}

export function Opcional() {
  return <span className="font-normal text-tinta-suave"> · opcional</span>;
}

/** Interruptor liga/desliga com título e explicação (ex.: "Aceitamos voluntários"). */
export function Interruptor({
  ligado,
  aoMudar,
  titulo,
  descricao,
  className,
}: {
  ligado: boolean;
  aoMudar: (ligado: boolean) => void;
  titulo: string;
  descricao: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-[14px] rounded-[16px] border border-borda-suave bg-papel px-4 py-[14px]",
        className
      )}
    >
      <span className="flex flex-1 flex-col gap-[3px]">
        <span className="text-[15px] font-semibold">{titulo}</span>
        <span className="text-[13px] leading-[1.4] text-tinta-suave">{descricao}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-label={titulo}
        onClick={() => aoMudar(!ligado)}
        className={cn(
          "flex h-7 w-12 shrink-0 cursor-pointer rounded-[14px] p-[3px] transition-colors",
          ligado ? "justify-end bg-musgo" : "justify-start bg-borda"
        )}
      >
        <span className="size-[22px] rounded-full bg-papel" />
      </button>
    </label>
  );
}

/** Opção de lista que liga e desliga (causa, item). */
export function Chip({
  selecionado,
  aoClicar,
  desabilitado,
  children,
}: {
  selecionado: boolean;
  aoClicar: () => void;
  desabilitado?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      disabled={desabilitado}
      onClick={aoClicar}
      className={cn(
        "cursor-pointer whitespace-nowrap rounded-[11px] px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selecionado
          ? "bg-musgo font-semibold text-papel hover:bg-musgo-escuro"
          : "border border-borda bg-papel font-medium hover:border-musgo"
      )}
    >
      {selecionado && "✓ "}
      {children}
    </button>
  );
}
