import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { perfilPublico } from "@/backend/services/ongs";
import { cn } from "@/lib/utils";
import { distanciaKm, formatarDistancia } from "@/lib/mapa/geo";
import { botoesDeContato, type BotaoContato } from "@/lib/ong/contatos";
import { tempoDesde } from "@/lib/ong/urgencia";
import { iniciais } from "@/utils/formatters/texto";
import { BotaoVoltar } from "./_components/BotaoVoltar";
import { DenunciarPerfil } from "./_components/DenunciarPerfil";
import { MapaEndereco } from "./_components/MapaEndereco";

type Props = {
  params: Promise<{ slug: string }>;
  /** ?de=lat,lng: de onde a pessoa veio no mapa, para mostrar a distância */
  searchParams: Promise<{ de?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ong = await perfilPublico((await params).slug);
  if (!ong) return { title: "ONG não encontrada · BuscaONG" };
  return { title: `${ong.nome} · BuscaONG`, description: ong.descricaoCurta };
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-tinta-suave">{titulo}</h2>
      {children}
    </section>
  );
}

function BotaoDeContato({ botao, className }: { botao: BotaoContato; className?: string }) {
  return (
    <a
      href={botao.href}
      {...(botao.externo ? { target: "_blank", rel: "noreferrer" } : {})}
      className={cn(
        "flex h-[52px] flex-1 items-center justify-center rounded-[15px] text-[15px] font-semibold transition-colors",
        botao.primario ? "bg-musgo text-papel hover:bg-musgo-escuro" : "bg-salvia-clara text-musgo hover:bg-salvia",
        className
      )}
    >
      {botao.rotulo}
    </a>
  );
}

function distanciaDe(de: string | undefined, posicao: { latitude: number; longitude: number } | null) {
  const [latitude, longitude] = (de ?? "").split(",").map(Number);
  if (!posicao || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return formatarDistancia(distanciaKm({ latitude, longitude }, posicao));
}

/** Página da ONG (P5): o que precisa, quando recebe voluntários e como falar com ela. */
export default async function PaginaOng({ params, searchParams }: Props) {
  const [{ slug }, { de }] = await Promise.all([params, searchParams]);
  const ong = await perfilPublico(slug);
  if (!ong) notFound();

  const { barra, fimDaPagina } = botoesDeContato(ong.contatos);
  const distancia = distanciaDe(de, ong.posicao);
  const subtitulo = [ong.causas[0], distancia, ong.local].filter(Boolean).join(" · ");
  const agora = new Date();

  return (
    <div className="min-h-dvh bg-creme">
      <div className="mx-auto max-w-[720px] md:pt-6">
        <header className="relative h-[150px] bg-[repeating-linear-gradient(135deg,var(--color-salvia)_0_14px,var(--color-salvia-clara)_14px_28px)] md:h-[240px] md:rounded-[24px]">
          {ong.capaUrl && (
            <Image src={ong.capaUrl} alt="" fill unoptimized priority className="object-cover md:rounded-[24px]" />
          )}
          <BotaoVoltar />
          <DenunciarPerfil ongId={ong.id} ongNome={ong.nome} />
          <div className="absolute -bottom-7 left-5 flex size-16 items-center justify-center overflow-hidden rounded-[19px] border-4 border-creme bg-musgo font-display text-xl font-bold text-papel">
            {ong.logoUrl ? <Image src={ong.logoUrl} alt="" fill unoptimized className="object-cover" /> : iniciais(ong.nome)}
          </div>
        </header>

        <main className={cn("flex flex-col gap-6 px-5 pt-10", barra.length ? "pb-32" : "pb-12")}>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.015em] md:text-[32px]">{ong.nome}</h1>
            {subtitulo && <p className="text-sm font-medium text-tinta-suave">{subtitulo}</p>}
            <p className="pt-1 text-[15px] leading-normal">{ong.descricaoCurta}</p>
          </div>

          {ong.urgencias.length > 0 && (
            <section className="flex flex-col gap-3 rounded-[18px] bg-terracota-clara px-4 py-3.5" aria-label="Urgente agora">
              <h2 className="text-xs font-bold uppercase tracking-[0.06em] text-terracota-escura">Urgente agora</h2>
              {ong.urgencias.map((u) => (
                <div key={u.item} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-base font-semibold text-terracota-funda">{u.nome}</span>
                    <span className="shrink-0 text-xs font-medium text-terracota-escura">{tempoDesde(u.criadaEm, agora)}</span>
                  </div>
                  {u.detalhe && <p className="text-sm leading-[1.45] text-terracota-funda">{u.detalhe}</p>}
                </div>
              ))}
            </section>
          )}

          {ong.itens.length > 0 && (
            <Secao titulo={ong.urgencias.length ? "Sempre precisa" : "Precisa de"}>
              <ul className="flex flex-wrap gap-1.5">
                {ong.itens.map((item) => (
                  <li key={item} className="rounded-[9px] bg-salvia-clara px-2.5 py-1.5 text-[13px] font-medium text-musgo-escuro">
                    {item}
                  </li>
                ))}
              </ul>
            </Secao>
          )}

          {ong.voluntariado && (
            <Secao titulo="Voluntariado">
              <ul className="flex flex-col">
                {ong.voluntariado.horarios.map((h, i) => (
                  <li key={i} className="flex justify-between gap-3 border-b border-borda-suave py-2 text-sm font-medium">
                    <span>
                      {h.dia} · {h.horario}
                    </span>
                    <span className="text-right text-tinta-suave">{h.atividade}</span>
                  </li>
                ))}
              </ul>
              {ong.voluntariado.requisitos && (
                <p className="whitespace-pre-line text-sm leading-normal text-tinta-suave">{ong.voluntariado.requisitos}</p>
              )}
            </Secao>
          )}

          {ong.sobre && (
            <Secao titulo="Sobre a ONG">
              <p className="whitespace-pre-line text-[15px] leading-relaxed">{ong.sobre}</p>
            </Secao>
          )}

          {ong.causas.length > 1 && (
            <Secao titulo="Causas">
              <p className="text-[15px]">{ong.causas.join(" · ")}</p>
            </Secao>
          )}

          {ong.posicao && (
            <Secao titulo="Onde fica">
              <MapaEndereco posicao={ong.posicao} endereco={ong.enderecoTexto} />
            </Secao>
          )}

          {fimDaPagina.length > 0 && (
            <div className="flex gap-2">
              {fimDaPagina.map((botao) => (
                <BotaoDeContato
                  key={botao.tipo}
                  botao={{ ...botao, primario: false }}
                  className="h-[50px] border border-borda bg-papel hover:bg-salvia-clara"
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {barra.length > 0 && (
        <nav aria-label="Falar com a ONG" className="fixed inset-x-0 bottom-0 z-20 border-t border-borda-suave bg-papel">
          <div className="mx-auto flex max-w-[720px] gap-2 px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-3">
            {barra.map((botao) => (
              <BotaoDeContato key={botao.tipo} botao={botao} />
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
