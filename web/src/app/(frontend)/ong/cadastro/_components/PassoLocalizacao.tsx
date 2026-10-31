'use client'
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { formatarCep, UFS } from "@/utils/validations/endereco";
import { MapaPin, type Posicao } from "./MapaPin";
import {
  CabecalhoPasso,
  ErroCampo,
  estiloAjuda,
  estiloCampo,
  estiloRotulo,
  FormularioPasso,
  Interruptor,
  MensagemErro,
  Opcional,
  RodapePasso,
} from "./ui";
import { useEnvioPasso } from "./useEnvioPasso";

export type EnderecoForm = {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
};

type Props = {
  enderecoInicial: EnderecoForm;
  posicaoInicial: Posicao | null;
  mostrarSoBairroInicial: boolean;
  /** o endereço veio da Receita (e não foi mudado no passo 1) */
  daReceita: boolean;
};

const CAMPOS: { nome: keyof EnderecoForm; rotulo: string; opcional?: boolean; autoComplete: string }[] = [
  { nome: "logradouro", rotulo: "Endereço", autoComplete: "address-line1" },
  { nome: "numero", rotulo: "Número", opcional: true, autoComplete: "off" },
  { nome: "bairro", rotulo: "Bairro", autoComplete: "address-level3" },
  { nome: "cep", rotulo: "CEP", autoComplete: "postal-code" },
  { nome: "municipio", rotulo: "Cidade", autoComplete: "address-level2" },
  { nome: "uf", rotulo: "UF", autoComplete: "address-level1" },
  { nome: "complemento", rotulo: "Complemento", opcional: true, autoComplete: "address-line2" },
];

export function PassoLocalizacao({ enderecoInicial, posicaoInicial, mostrarSoBairroInicial, daReceita }: Props) {
  const { enviando, erro, campos, enviar } = useEnvioPasso("localizacao", "/ong/cadastro/contatos");
  const [endereco, setEndereco] = useState(enderecoInicial);
  const [posicao, setPosicao] = useState<Posicao | null>(posicaoInicial);
  const [mostrarSoBairro, setMostrarSoBairro] = useState(mostrarSoBairroInicial);
  const [localizando, setLocalizando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erroPin, setErroPin] = useState<string | null>(null);
  const jaLocalizou = useRef(false);

  async function localizar(dados: EnderecoForm) {
    if (!dados.municipio.trim() || !dados.uf) {
      setAviso("Preencha a cidade e a UF para localizar no mapa.");
      return;
    }
    setLocalizando(true);
    setAviso(null);

    const params = new URLSearchParams();
    for (const chave of ["logradouro", "numero", "bairro", "municipio", "uf", "cep"] as const) {
      if (dados[chave].trim()) params.set(chave, dados[chave].trim());
    }

    try {
      const response = await fetch(`/api/geocodificacao?${params}`);
      const body = await response.json().catch(() => null);
      if (response.ok) {
        setPosicao({ latitude: body.latitude, longitude: body.longitude });
        setErroPin(null);
        if (body.precisao === "cidade") {
          setAviso("Achamos só a cidade. Arraste o pin até a entrada onde as doações são recebidas.");
        }
      } else {
        setAviso(body?.error?.message ?? "Não foi possível localizar o endereço. Posicione o pin no mapa.");
      }
    } catch {
      setAviso("Sem conexão para localizar o endereço. Posicione o pin no mapa.");
    } finally {
      setLocalizando(false);
    }
  }

  // primeira visita: põe o pin no endereço que veio da Receita
  useEffect(() => {
    if (jaLocalizou.current || posicaoInicial) return;
    jaLocalizou.current = true;
    if (enderecoInicial.municipio && enderecoInicial.uf) void localizar(enderecoInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mudar(campo: keyof EnderecoForm, valor: string) {
    setEndereco((atual) => ({ ...atual, [campo]: campo === "cep" ? formatarCep(valor) : valor }));
  }

  function moverPin(nova: Posicao) {
    setPosicao(nova);
    setErroPin(null);
    setAviso(null);
  }

  function salvar() {
    if (!posicao) {
      setErroPin("Posicione o pin no mapa para continuar.");
      return;
    }
    void enviar({ endereco, latitude: posicao.latitude, longitude: posicao.longitude, mostrarSoBairro });
  }

  function campo(nome: keyof EnderecoForm) {
    const def = CAMPOS.find((c) => c.nome === nome)!;
    const erroDoCampo = campos[`endereco.${nome}`];
    const id = `endereco-${nome}`;
    return (
      <div className="flex min-w-0 flex-col gap-[7px]">
        <label htmlFor={id} className={estiloRotulo}>
          {def.rotulo}
          {def.opcional && <Opcional />}
        </label>
        {nome === "uf" ? (
          <select
            id={id}
            value={endereco.uf}
            onChange={(e) => mudar("uf", e.target.value)}
            aria-invalid={!!erroDoCampo}
            className={cn(estiloCampo, "px-3", erroDoCampo && "border-2 border-tinta")}
          >
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            value={endereco[nome]}
            onChange={(e) => mudar(nome, e.target.value)}
            autoComplete={def.autoComplete}
            inputMode={nome === "cep" ? "numeric" : undefined}
            placeholder={nome === "complemento" ? "Ex: portão lateral" : undefined}
            aria-invalid={!!erroDoCampo}
            aria-describedby={erroDoCampo ? `${id}-erro` : undefined}
            className={cn(estiloCampo, erroDoCampo && "border-2 border-tinta")}
          />
        )}
        <ErroCampo id={`${id}-erro`}>{erroDoCampo}</ErroCampo>
      </div>
    );
  }

  return (
    <FormularioPasso aoEnviar={salvar}>
      <CabecalhoPasso titulo="Confirme onde fica a ONG">
        {daReceita
          ? "Trouxemos o endereço da Receita Federal. Arraste o pin até a entrada onde as doações são recebidas."
          : "Informe o endereço atual e arraste o pin até a entrada onde as doações são recebidas."}
      </CabecalhoPasso>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_96px] gap-3">
            {campo("logradouro")}
            {campo("numero")}
          </div>
          {daReceita && <span className={cn(estiloAjuda, "-mt-2")}>Preenchido a partir do CNPJ</span>}
          <div className="grid grid-cols-2 gap-3">
            {campo("bairro")}
            {campo("cep")}
          </div>
          <div className="grid grid-cols-[1fr_96px] gap-3">
            {campo("municipio")}
            {campo("uf")}
          </div>
          {campo("complemento")}

          <button
            type="button"
            onClick={() => localizar(endereco)}
            disabled={localizando}
            className="cursor-pointer self-start text-sm font-semibold text-musgo underline underline-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {localizando ? "Localizando…" : "Localizar este endereço no mapa"}
          </button>

          <Interruptor
            ligado={mostrarSoBairro}
            aoMudar={setMostrarSoBairro}
            titulo="Mostrar só o bairro no perfil"
            descricao="Para abrigos que não divulgam o endereço. O pin fica numa área aproximada."
          />
        </div>

        <div className="flex flex-col gap-2">
          <MapaPin posicao={posicao} aoMover={moverPin} areaAproximada={mostrarSoBairro} />
          {aviso && (
            <span role="status" className="text-[13px] font-semibold text-tinta">
              {aviso}
            </span>
          )}
          <ErroCampo id="erro-pin">{erroPin ?? campos.latitude ?? campos.longitude}</ErroCampo>
          <span className="text-xs text-tinta-suave">
            Posição inicial a partir do endereço: © colaboradores do OpenStreetMap.
          </span>
        </div>
      </div>

      <MensagemErro>{erro}</MensagemErro>
      {/* sem Voltar: a conta já existe, os passos 1 e 2 não se refazem */}
      <RodapePasso enviando={enviando} />
    </FormularioPasso>
  );
}
