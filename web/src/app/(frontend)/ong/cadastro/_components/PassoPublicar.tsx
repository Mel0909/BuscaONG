'use client'
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { enviarPasso } from "../_actions/enviarPasso";
import { CartaoOng, type DadosCartaoOng } from "@/components/ong/CartaoOng";
import { CabecalhoPasso, estiloBotaoPrimario, estiloTituloSecao, FormularioPasso, MensagemErro, RodapePasso } from "./ui";

export type ItemVerificacao = {
  texto: string;
  ok: boolean;
  /** item opcional: sem ✓, mas não impede publicar */
  opcional?: boolean;
  /** passo onde se resolve o que falta */
  rota?: string;
};

type Props = {
  cartao: DadosCartaoOng;
  verificacao: ItemVerificacao[];
  status: "RASCUNHO" | "PUBLICADA" | "SUSPENSA";
};

function Marca({ ok, opcional }: { ok: boolean; opcional?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-bold",
        ok ? "bg-musgo text-papel" : opcional ? "bg-salvia-clara text-tinta-suave" : "border-[1.5px] border-tinta text-tinta"
      )}
    >
      {ok ? "✓" : opcional ? "–" : "!"}
    </span>
  );
}

function Publicado({ cartao }: { cartao: DadosCartaoOng }) {
  return (
    <div className="flex max-w-[560px] flex-col gap-6">
      <CabecalhoPasso titulo="Perfil publicado!">
        A ONG já está no perto. Quem procura ONGs por perto vai encontrar vocês com o card abaixo.
      </CabecalhoPasso>
      <CartaoOng {...cartao} />
      <Link href="/" className={cn(estiloBotaoPrimario, "flex items-center self-start")}>
        Ir para o início
      </Link>
    </div>
  );
}

export function PassoPublicar({ cartao, verificacao, status }: Props) {
  const [aceita, setAceita] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [publicada, setPublicada] = useState(status === "PUBLICADA");

  if (status === "SUSPENSA") {
    return (
      <CabecalhoPasso titulo="Perfil suspenso">
        O perfil desta ONG foi retirado do ar pela equipe do perto. Fale com a gente para entender o motivo.
      </CabecalhoPasso>
    );
  }
  if (publicada) return <Publicado cartao={cartao} />;

  const pendente = verificacao.some((v) => !v.ok && !v.opcional);

  async function publicar() {
    if (!aceita || pendente || enviando) return;
    setEnviando(true);
    setErro(null);
    const resposta = await enviarPasso("publicacao", { aceitaTermos: true }, "POST");
    setEnviando(false);
    if (resposta.ok) setPublicada(true);
    else setErro(resposta.mensagem);
  }

  return (
    <FormularioPasso aoEnviar={publicar}>
      <CabecalhoPasso titulo="Tudo certo para aparecer no mapa">
        É assim que as pessoas vão ver vocês. Tudo pode ser editado depois, no painel.
      </CabecalhoPasso>

      <div className="grid max-w-[960px] gap-10 md:grid-cols-[400px_1fr]">
        <section className="flex flex-col gap-3">
          <h2 className={estiloTituloSecao}>Card no mapa e na lista</h2>
          <CartaoOng {...cartao} />
        </section>

        <section className="flex flex-col gap-[14px]">
          <h2 className={estiloTituloSecao}>Verificação</h2>
          <ul className="flex flex-col gap-[14px]">
            {verificacao.map((item) => (
              <li key={item.texto} className="flex items-center gap-[10px] text-[15px] font-medium">
                <Marca ok={item.ok} opcional={item.opcional} />
                <span className={item.ok ? "text-tinta" : "text-tinta-suave"}>{item.texto}</span>
                {!item.ok && !item.opcional && item.rota && (
                  <Link href={item.rota} className="text-sm font-semibold text-musgo underline underline-offset-2">
                    Completar
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="my-1.5 h-px bg-borda-suave" />

          <label className="flex cursor-pointer items-start gap-3 text-sm leading-normal">
            <input
              type="checkbox"
              checked={aceita}
              onChange={(e) => setAceita(e.target.checked)}
              className="mt-0.5 size-[22px] shrink-0 cursor-pointer accent-musgo"
            />
            <span>
              Li e aceito os{" "}
              <Link href="/termos" target="_blank" className="font-semibold text-musgo underline underline-offset-2">
                termos de uso
              </Link>
              , incluindo o uso responsável da marcação de urgência.
            </span>
          </label>

          <MensagemErro>{erro}</MensagemErro>
        </section>
      </div>

      <RodapePasso
        voltar="/ong/cadastro/apresentacao"
        enviando={enviando}
        desabilitado={!aceita || pendente}
        rotulo="Publicar perfil"
      />
    </FormularioPasso>
  );
}
