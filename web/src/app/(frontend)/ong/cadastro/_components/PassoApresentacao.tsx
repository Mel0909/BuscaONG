'use client'
import { useState } from "react";

import { cn } from "@/lib/utils";
import { MAX_DESCRICAO_CURTA } from "@/lib/cadastro/limites";
import { EnvioImagem, type Imagem } from "./EnvioImagem";
import {
  CabecalhoPasso,
  ErroCampo,
  estiloAjuda,
  estiloAreaTexto,
  estiloCampo,
  estiloRotulo,
  FormularioPasso,
  MensagemErro,
  Opcional,
  RodapePasso,
} from "./ui";
import { useEnvioPasso } from "./useEnvioPasso";

type Props = {
  inicial: {
    nomePublico: string;
    descricaoCurta: string;
    sobre: string;
    logo: Imagem | null;
    capa: Imagem | null;
  };
  /** false quando o R2 não está configurado */
  envioDisponivel: boolean;
};

export function PassoApresentacao({ inicial, envioDisponivel }: Props) {
  const { enviando, erro, campos, enviar } = useEnvioPasso("apresentacao", "/ong/cadastro/publicar");
  const [nomePublico, setNomePublico] = useState(inicial.nomePublico);
  const [descricaoCurta, setDescricaoCurta] = useState(inicial.descricaoCurta);
  const [sobre, setSobre] = useState(inicial.sobre);
  const [logo, setLogo] = useState(inicial.logo);
  const [capa, setCapa] = useState(inicial.capa);

  function salvar() {
    void enviar({ nomePublico, descricaoCurta, sobre, logo: logo?.chave ?? null, capa: capa?.chave ?? null });
  }

  return (
    <FormularioPasso aoEnviar={salvar}>
      <CabecalhoPasso titulo="Apresente a ONG">
        Foto e logo são opcionais, mas perfis com imagem recebem mais contatos.
      </CabecalhoPasso>

      <div className="grid max-w-[940px] gap-8 md:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <EnvioImagem tipo="logo" valor={logo} aoMudar={setLogo} disponivel={envioDisponivel} />
          <EnvioImagem tipo="capa" valor={capa} aoMudar={setCapa} disponivel={envioDisponivel} />
          <ErroCampo id="erro-imagens">{campos.logo ?? campos.capa}</ErroCampo>
        </div>

        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="nome-publico" className={estiloRotulo}>
              Nome público
            </label>
            <input
              id="nome-publico"
              value={nomePublico}
              maxLength={80}
              onChange={(e) => setNomePublico(e.target.value)}
              aria-invalid={!!campos.nomePublico}
              className={cn(estiloCampo, campos.nomePublico && "border-2 border-tinta")}
            />
            <span className={estiloAjuda}>Pode ser diferente da razão social</span>
            <ErroCampo id="erro-nome-publico">{campos.nomePublico}</ErroCampo>
          </div>

          <div className="flex flex-col gap-[7px]">
            <label htmlFor="descricao-curta" className={estiloRotulo}>
              Descrição curta
            </label>
            <textarea
              id="descricao-curta"
              rows={2}
              maxLength={MAX_DESCRICAO_CURTA}
              value={descricaoCurta}
              onChange={(e) => setDescricaoCurta(e.target.value)}
              placeholder="Ex: Acolhemos 22 crianças de 0 a 12 anos desde 1998."
              aria-invalid={!!campos.descricaoCurta}
              className={cn(estiloAreaTexto, campos.descricaoCurta && "border-2 border-tinta")}
            />
            <span className={cn(estiloAjuda, "self-end")}>
              {descricaoCurta.length} / {MAX_DESCRICAO_CURTA} · aparece no card
            </span>
            <ErroCampo id="erro-descricao-curta">{campos.descricaoCurta}</ErroCampo>
          </div>

          <div className="flex flex-col gap-[7px]">
            <label htmlFor="sobre" className={estiloRotulo}>
              Sobre a ONG
              <Opcional />
            </label>
            <textarea
              id="sobre"
              rows={5}
              maxLength={2000}
              value={sobre}
              onChange={(e) => setSobre(e.target.value)}
              className={estiloAreaTexto}
            />
            <span className={cn(estiloAjuda, "self-end")}>aparece na página completa</span>
            <ErroCampo id="erro-sobre">{campos.sobre}</ErroCampo>
          </div>
        </div>
      </div>

      <MensagemErro>{erro}</MensagemErro>
      <RodapePasso voltar="/ong/cadastro/voluntariado" enviando={enviando} />
    </FormularioPasso>
  );
}
