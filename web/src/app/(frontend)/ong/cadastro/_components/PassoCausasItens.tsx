'use client'
import { useEffect, useState } from "react";

import { MAX_CAUSAS, MAX_ITENS_LIVRES } from "@/lib/cadastro/limites";
import { normalizarChave } from "@/utils/formatters/texto";
import {
  CabecalhoPasso,
  Chip,
  ErroCampo,
  estiloAviso,
  estiloBotaoSecundario,
  estiloTituloSecao,
  FormularioPasso,
  MensagemErro,
  RodapePasso,
} from "./ui";
import { useEnvioPasso } from "./useEnvioPasso";

type Opcao = { slug: string; nome: string };
type Sugestao = { nome: string; chave: string; ongs: number };

type Props = {
  causas: Opcao[];
  itens: Opcao[];
  inicial: { causas: string[]; itens: string[]; itensLivres: string[] };
};

const alternar = (lista: string[], valor: string) =>
  lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];

export function PassoCausasItens({ causas, itens, inicial }: Props) {
  const { enviando, erro, campos, enviar } = useEnvioPasso("causas-itens", "/ong/cadastro/voluntariado");
  const [causasEscolhidas, setCausas] = useState(inicial.causas);
  const [itensEscolhidos, setItens] = useState(inicial.itens);
  const [itensLivres, setItensLivres] = useState(inicial.itensLivres);
  const [texto, setTexto] = useState("");
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);

  // sugestão de item já usado por outras ONGs, depois de uma pausa na digitação
  const busca = normalizarChave(texto);
  useEffect(() => {
    if (busca.length < 3) return;
    const controle = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/itens-livres?q=${encodeURIComponent(busca)}`, { signal: controle.signal });
        const lista: Sugestao[] = response.ok ? await response.json() : [];
        setSugestao(lista[0] ?? null); // a mais usada
      } catch {
        // sem sugestão; não atrapalha o cadastro
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controle.abort();
    };
  }, [busca]);

  const sugestaoVisivel = busca.length >= 3 && sugestao?.chave.startsWith(busca) ? sugestao : null;

  function adicionar(nome = texto) {
    const limpo = nome.trim().replace(/\s+/g, " ");
    const chave = normalizarChave(limpo);
    if (chave.length < 2) return;

    // o mesmo nome de um item da lista marca o item da lista
    const daLista = itens.find((i) => normalizarChave(i.nome) === chave);
    if (daLista) {
      if (!itensEscolhidos.includes(daLista.slug)) setItens([...itensEscolhidos, daLista.slug]);
    } else if (!itensLivres.some((i) => normalizarChave(i) === chave) && itensLivres.length < MAX_ITENS_LIVRES) {
      setItensLivres([...itensLivres, limpo]);
    }
    setTexto("");
    setSugestao(null);
  }

  const causasCheias = causasEscolhidas.length >= MAX_CAUSAS;

  return (
    <FormularioPasso
      aoEnviar={() => enviar({ causas: causasEscolhidas, itens: itensEscolhidos, itensLivres })}
    >
      <CabecalhoPasso titulo="Causa e o que vocês costumam precisar">
        São as listas que alimentam os filtros do mapa. Escolha até {MAX_CAUSAS} causas. Itens fora da lista podem ser
        adicionados como texto.
      </CabecalhoPasso>

      <div className="flex max-w-[900px] flex-col gap-[22px]">
        <section className="flex flex-col gap-[10px]">
          <h2 className={estiloTituloSecao}>
            Causas · {causasEscolhidas.length} de {MAX_CAUSAS}
          </h2>
          <div className="flex flex-wrap gap-2">
            {causas.map((c) => {
              const selecionada = causasEscolhidas.includes(c.slug);
              return (
                <Chip
                  key={c.slug}
                  selecionado={selecionada}
                  desabilitado={!selecionada && causasCheias}
                  aoClicar={() => setCausas(alternar(causasEscolhidas, c.slug))}
                >
                  {c.nome}
                </Chip>
              );
            })}
          </div>
          <ErroCampo id="erro-causas">{campos.causas}</ErroCampo>
        </section>

        <section className="flex flex-col gap-[10px]">
          <h2 className={estiloTituloSecao}>Itens que costumam precisar</h2>
          <div className="flex flex-wrap gap-2">
            {itens.map((i) => (
              <Chip
                key={i.slug}
                selecionado={itensEscolhidos.includes(i.slug)}
                aoClicar={() => setItens(alternar(itensEscolhidos, i.slug))}
              >
                {i.nome}
              </Chip>
            ))}
          </div>
          <ErroCampo id="erro-itens">{campos.itens}</ErroCampo>
        </section>

        <section className="flex flex-col gap-[10px]">
          <h2 className={estiloTituloSecao}>
            <label htmlFor="item-livre">Outros itens</label>
          </h2>
          <div className="flex max-w-[560px] gap-2">
            <input
              id="item-livre"
              value={texto}
              maxLength={40}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                // Enter adiciona o item em vez de enviar o formulário
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionar();
                }
              }}
              placeholder="Ex: Ventilador"
              className="h-12 min-w-0 flex-1 rounded-[13px] border border-borda bg-papel px-[14px] text-[15px] outline-none focus:border-2 focus:border-musgo"
            />
            <button
              type="button"
              onClick={() => adicionar()}
              disabled={normalizarChave(texto).length < 2}
              className={`${estiloBotaoSecundario} h-12 rounded-[13px] px-[18px] text-sm disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Adicionar
            </button>
          </div>

          {sugestaoVisivel && (
            <p className="text-[13px] text-tinta-suave">
              Sugestão:{" "}
              <button
                type="button"
                onClick={() => adicionar(sugestaoVisivel.nome)}
                className="cursor-pointer font-semibold text-musgo underline"
              >
                “{sugestaoVisivel.nome}”
              </button>{" "}
              já foi cadastrado por {sugestaoVisivel.ongs === 1 ? "outra ONG" : `outras ${sugestaoVisivel.ongs} ONGs`}.
              Usar o mesmo nome ajuda quem filtra.
            </p>
          )}

          {itensLivres.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Itens fora da lista">
              {itensLivres.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 whitespace-nowrap rounded-[11px] border border-dashed border-tinta-suave bg-papel px-3 py-2 text-sm font-semibold"
                >
                  {item}
                  <button
                    type="button"
                    aria-label={`Remover ${item}`}
                    onClick={() => setItensLivres(itensLivres.filter((i) => i !== item))}
                    className="cursor-pointer text-base leading-none text-tinta-suave hover:text-tinta"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ErroCampo id="erro-itens-livres">
            {Object.entries(campos).find(([campo]) => campo.startsWith("itensLivres"))?.[1]}
          </ErroCampo>
        </section>

        <p className={estiloAviso}>A urgência é marcada depois, no painel, item por item.</p>
        <MensagemErro>{erro}</MensagemErro>
      </div>

      <RodapePasso voltar="/ong/cadastro/contatos" enviando={enviando} />
    </FormularioPasso>
  );
}
