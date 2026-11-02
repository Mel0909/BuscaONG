import Link from "next/link";

import { prazoRestante } from "@/lib/ong/urgencia";
import { ArrowRight, ExternalLink } from "lucide-react";
import { CartaoOng } from "@/components/ong/CartaoOng";
import { CopiarLink } from "./_components/CopiarLink";
import { Caixa, TituloPainel, TituloSecao } from "./_components/ui";
import { carregarPainel } from "./_utils/carregarPainel";
import { dadosDoPainel } from "./_utils/dadosDoPainel";

const ATALHOS = [
  { href: "/ong/painel/itens", titulo: "Itens e urgência", texto: "Marque o que está faltando agora e mantenha a lista de itens em dia." },
  { href: "/ong/painel/perfil", titulo: "Perfil público", texto: "Nome, descrição, fotos, contatos e endereço." },
  { href: "/ong/painel/voluntariado", titulo: "Voluntariado", texto: "Dias, horários e atividades para quem quer ajudar." },
];

// painel da ONG (O2): situação do perfil, urgências e atalhos
export default async function PainelInicioPage() {
  const { ong } = await carregarPainel();
  const { cartao, urgencias, pagina } = await dadosDoPainel(ong);
  const suspensa = ong.status === "SUSPENSA";
  // endereço do site sem o protocolo, para mostrar o link da página
  const site = (process.env.BETTER_AUTH_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="flex max-w-[1040px] flex-col gap-8">
      <TituloPainel titulo={`Olá, ${cartao.nome}`}>
        {suspensa ? "O perfil está fora do ar." : "O perfil está no mapa. Mantenha os itens e as urgências em dia."}
      </TituloPainel>

      {suspensa ? (
        <div role="status" className="flex flex-col gap-2 rounded-[18px] border-2 border-tinta bg-papel px-5 py-4">
          <span className="font-display text-lg font-semibold">Perfil suspenso pela equipe do BuscaONG</span>
          <span className="text-sm leading-normal text-tinta-suave">
            Enquanto estiver suspenso, o perfil não aparece no mapa e não dá para marcar urgências. Se acha que foi um
            engano ou já resolveu o problema, responda o e-mail que enviamos.
          </span>
        </div>
      ) : (
        <Caixa className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">Página da ONG</span>
            <span className="truncate font-mono text-[13px] text-tinta-suave">{site}{pagina}</span>
          </div>
          <div className="flex shrink-0 gap-2">
            <CopiarLink caminho={pagina} />
            <Link
              href={pagina}
              target="_blank"
              className="flex h-10 items-center gap-1.5 rounded-[12px] bg-musgo px-4 text-sm font-semibold text-papel hover:bg-musgo-escuro"
            >
              Ver página <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </Caixa>
      )}

      <div className="grid gap-8 md:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-3">
          <TituloSecao>Urgente agora</TituloSecao>
          <Caixa className="flex flex-col">
            {urgencias.length === 0 ? (
              <p className="px-5 py-4 text-[15px] text-tinta-suave">
                Nenhum item urgente. Quando faltar algo, marque o item como urgente: o pin fica terracota no mapa.
              </p>
            ) : (
              <ul>
                {urgencias.map((u) => (
                  <li key={u.item} className="flex items-baseline justify-between gap-3 border-b border-borda-suave px-5 py-3 last:border-b-0">
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold">{u.nome}</span>
                      {u.detalhe && <span className="text-sm text-tinta-suave">{u.detalhe}</span>}
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-terracota-escura">{prazoRestante(u.ate)}</span>
                  </li>
                ))}
              </ul>
            )}
            {!suspensa && (
              <Link
                href="/ong/painel/itens"
                className="flex items-center gap-1.5 border-t border-borda-suave px-5 py-3 text-sm font-semibold text-musgo hover:bg-salvia-clara"
              >
                {urgencias.length ? "Gerenciar urgências" : "Marcar um item como urgente"} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </Caixa>
        </section>

        <section className="flex flex-col gap-3">
          <TituloSecao>Como aparece no mapa</TituloSecao>
          <CartaoOng {...cartao} />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <TituloSecao>Atualizar</TituloSecao>
        <div className="grid gap-3 md:grid-cols-3">
          {ATALHOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col gap-1 rounded-[18px] border border-borda-suave bg-papel px-5 py-4 transition-colors hover:border-musgo"
            >
              <span className="flex items-center justify-between text-[15px] font-semibold">
                {a.titulo} <ArrowRight className="size-4 text-musgo" aria-hidden="true" />
              </span>
              <span className="text-sm leading-normal text-tinta-suave">{a.texto}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
