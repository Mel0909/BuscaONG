'use client'
import { useState } from "react";

import { cn } from "@/lib/utils";
import { linkWhatsapp, normalizarWhatsapp } from "@/utils/validations/contatos";
import {
  CabecalhoPasso,
  ErroCampo,
  estiloAviso,
  estiloCampo,
  estiloRotulo,
  estiloTituloSecao,
  FormularioPasso,
  MensagemErro,
  Opcional,
  RodapePasso,
} from "./ui";
import { useEnvioPasso } from "./useEnvioPasso";

type Contato = { valor: string; visivel: boolean };
export type ContatosForm = Record<"whatsapp" | "email" | "site" | "instagram", Contato>;
type NomeContato = keyof ContatosForm;

const DEFINICOES: Record<NomeContato, { rotulo: string; placeholder: string; opcional?: boolean; tipo: string }> = {
  whatsapp: { rotulo: "WhatsApp", placeholder: "(11) 97123-4567", tipo: "tel" },
  email: { rotulo: "E-mail de contato", placeholder: "Mesmo do acesso ou outro", tipo: "email" },
  site: { rotulo: "Site", placeholder: "suaong.org.br", opcional: true, tipo: "url" },
  instagram: { rotulo: "Instagram", placeholder: "@suaong", opcional: true, tipo: "text" },
};

export function PassoContatos({ inicial, emailAcesso }: { inicial: ContatosForm; emailAcesso: string }) {
  const { enviando, erro, campos, enviar } = useEnvioPasso("contatos", "/ong/cadastro/causas-itens");
  const [contatos, setContatos] = useState(inicial);

  function mudar(nome: NomeContato, parte: Partial<Contato>) {
    setContatos((atual) => ({ ...atual, [nome]: { ...atual[nome], ...parte } }));
  }

  const whatsapp = normalizarWhatsapp(contatos.whatsapp.valor);

  function campo(nome: NomeContato) {
    const def = DEFINICOES[nome];
    const id = `contato-${nome}`;
    // o erro de "nenhum contato visível" vem no campo whatsapp
    const erroDoCampo = campos[`${nome}.valor`] ?? (nome === "whatsapp" ? campos.whatsapp : undefined);

    return (
      <div className="flex min-w-0 flex-col gap-[7px]">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className={estiloRotulo}>
            {def.rotulo}
            {def.opcional && <Opcional />}
          </label>
          <label className="flex cursor-pointer items-center gap-[7px] text-[13px] font-medium">
            <input
              type="checkbox"
              checked={contatos[nome].visivel}
              onChange={(e) => mudar(nome, { visivel: e.target.checked })}
              className="size-[18px] cursor-pointer accent-musgo"
            />
            Visível na página
          </label>
        </div>

        <div className="relative">
          <input
            id={id}
            type={def.tipo}
            inputMode={nome === "whatsapp" ? "tel" : undefined}
            autoComplete={nome === "email" ? "email" : nome === "whatsapp" ? "tel" : "off"}
            placeholder={def.placeholder}
            value={contatos[nome].valor}
            onChange={(e) => mudar(nome, { valor: e.target.value })}
            aria-invalid={!!erroDoCampo}
            aria-describedby={erroDoCampo ? `${id}-erro` : undefined}
            className={cn(estiloCampo, nome === "whatsapp" && "pr-44", erroDoCampo && "border-2 border-tinta")}
          />
          {nome === "whatsapp" && whatsapp && (
            <a
              href={linkWhatsapp(whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-musgo underline"
            >
              Testar no WhatsApp
            </a>
          )}
        </div>

        {nome === "email" && contatos.email.valor.trim().toLowerCase() !== emailAcesso && (
          <button
            type="button"
            onClick={() => mudar("email", { valor: emailAcesso })}
            className="cursor-pointer self-start text-[13px] font-semibold text-musgo underline"
          >
            Usar {emailAcesso}
          </button>
        )}
        <ErroCampo id={`${id}-erro`}>{erroDoCampo}</ErroCampo>
      </div>
    );
  }

  return (
    <FormularioPasso aoEnviar={() => enviar(contatos)}>
      <CabecalhoPasso titulo="Contatos e redes públicas">
        Como as pessoas vão falar com vocês e conhecer o trabalho da ONG.
      </CabecalhoPasso>

      <div className="flex max-w-[860px] flex-col gap-[26px]">
        <section className="flex flex-col gap-3">
          <h2 className={estiloTituloSecao}>Contatos · deixe pelo menos um visível</h2>
          <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
            {campo("whatsapp")}
            {campo("email")}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={estiloTituloSecao}>Site e redes</h2>
          <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
            {campo("site")}
            {campo("instagram")}
          </div>
        </section>

        <p className={estiloAviso}>
          Só o que estiver marcado como visível aparece na página. Desmarcados ficam salvos no painel, sem aparecer.
          Dos visíveis, os dois primeiros nesta ordem (WhatsApp, e-mail, site, Instagram) viram os botões fixos; o
          resto vai para o fim da página.
        </p>

        <MensagemErro>{erro}</MensagemErro>
      </div>

      <RodapePasso voltar="/ong/cadastro/localizacao" enviando={enviando} />
    </FormularioPasso>
  );
}
