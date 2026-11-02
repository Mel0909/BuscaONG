'use client'
import { useRouter } from "next/navigation";
import { useState, type DragEvent } from "react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import type { OpcaoAdmin } from "@/backend/services/admin";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { Dialogo } from "@/components/base/Dialogo";
import { chamarAdmin } from "../../_actions/api";
import { estiloBotaoClaro, estiloBotaoEscuro, estiloBotaoPerigo, estiloCabecalhoTabela, estiloCampoAdmin, Selo } from "../../_components/ui";

type Tipo = "CAUSA" | "ITEM" | "ATIVIDADE";
type Props = { tipo: Tipo; opcoes: OpcaoAdmin[]; nomeSingular: string };

/**
 * A4: opções de uma lista. Arrastar (ou as setas, pelo teclado) define a ordem nos filtros e no
 * cadastro. Opção em uso não se exclui: unifica com outra ou desativa.
 */
export function TabelaLista({ tipo, opcoes, nomeSingular }: Props) {
  const router = useRouter();
  const [ordem, setOrdem] = useState(opcoes);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [editando, setEditando] = useState<OpcaoAdmin | null>(null);
  const [criando, setCriando] = useState(false);
  const comGrupo = tipo === "ITEM";

  // a lista do servidor mudou (depois de salvar): recomeça dela
  const [base, setBase] = useState(opcoes);
  if (base !== opcoes) {
    setBase(opcoes);
    setOrdem(opcoes);
  }

  async function salvarOrdem(nova: OpcaoAdmin[]) {
    const antiga = ordem;
    setOrdem(nova);
    const resposta = await chamarAdmin("PUT", "listas/ordem", { tipo, ids: nova.map((o) => o.id) });
    if (!resposta.ok) {
      setOrdem(antiga);
      return toast.error(resposta.mensagem);
    }
    toast.success("Ordem salva");
    router.refresh();
  }

  function mover(id: string, destino: number) {
    const atual = ordem.findIndex((o) => o.id === id);
    if (atual < 0 || destino < 0 || destino >= ordem.length || destino === atual) return;
    const nova = [...ordem];
    const [opcao] = nova.splice(atual, 1);
    nova.splice(destino, 0, opcao);
    salvarOrdem(nova);
  }

  function soltar(e: DragEvent, alvo: string) {
    e.preventDefault();
    if (arrastando) mover(arrastando, ordem.findIndex((o) => o.id === alvo));
    setArrastando(null);
  }

  const colunas = comGrupo ? "grid-cols-[56px_1.4fr_1fr_110px_70px]" : "grid-cols-[56px_1.6fr_110px_70px]";

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-cinza-borda bg-branco">
        <div className="min-w-[520px]">
          <div className={cn("grid items-center gap-2", colunas, estiloCabecalhoTabela)}>
            <span />
            <span>{nomeSingular}</span>
            {comGrupo && <span>Grupo</span>}
            <span>ONGs usando</span>
            <span />
          </div>
          <ul>
            {ordem.map((o, i) => (
              <li
                key={o.id}
                draggable
                onDragStart={() => setArrastando(o.id)}
                onDragEnd={() => setArrastando(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => soltar(e, o.id)}
                className={cn(
                  "grid items-center gap-2 border-t border-cinza-linha px-4 py-2 text-[13px]",
                  colunas,
                  arrastando === o.id && "opacity-40"
                )}
              >
                <span className="flex items-center text-cinza-texto">
                  <GripVertical className="size-4 cursor-grab" aria-hidden="true" />
                  <span className="flex flex-col">
                    <button type="button" aria-label={`Subir ${o.nome}`} disabled={i === 0} onClick={() => mover(o.id, i - 1)} className="cursor-pointer disabled:opacity-25">
                      <ArrowUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Descer ${o.nome}`}
                      disabled={i === ordem.length - 1}
                      onClick={() => mover(o.id, i + 1)}
                      className="cursor-pointer disabled:opacity-25"
                    >
                      <ArrowDown className="size-3" />
                    </button>
                  </span>
                </span>
                <span className="flex items-center gap-2 font-semibold">
                  {o.nome}
                  {!o.ativa && <Selo tipo="neutro">inativa</Selo>}
                </span>
                {comGrupo && <span className="text-cinza-texto">{o.grupo ?? "—"}</span>}
                <span className="tabular-nums">{o.ongs}</span>
                <button type="button" onClick={() => setEditando(o)} className="cursor-pointer text-xs font-semibold text-musgo">
                  Editar
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="w-full cursor-pointer border-t border-cinza-linha px-4 py-3 text-left text-[13px] font-semibold text-musgo hover:bg-cinza-fundo"
          >
            + Novo {nomeSingular.toLowerCase()}
          </button>
        </div>
      </div>

      {criando && <NovaOpcao tipo={tipo} comGrupo={comGrupo} nomeSingular={nomeSingular} aoFechar={() => setCriando(false)} />}
      {editando && (
        <EditarOpcao
          key={editando.id}
          opcao={editando}
          outras={ordem.filter((o) => o.id !== editando.id)}
          comGrupo={comGrupo}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function NovaOpcao({ tipo, comGrupo, nomeSingular, aoFechar }: { tipo: Tipo; comGrupo: boolean; nomeSingular: string; aoFechar: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function criar() {
    setEnviando(true);
    const resposta = await chamarAdmin("POST", "listas", { tipo, nome, grupo });
    setEnviando(false);
    if (!resposta.ok) return toast.error(resposta.mensagem);
    toast.success(`“${nome}” adicionado`);
    aoFechar();
    router.refresh();
  }

  return (
    <Dialogo titulo={`Novo ${nomeSingular.toLowerCase()}`} aoFechar={aoFechar}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          criar();
        }}
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} className={estiloCampoAdmin} />
        </label>
        {comGrupo && (
          <label className="flex flex-col gap-1.5 text-xs font-semibold">
            Grupo (opcional)
            <input value={grupo} onChange={(e) => setGrupo(e.target.value)} maxLength={40} placeholder="Ex.: Higiene e cuidado" className={estiloCampoAdmin} />
          </label>
        )}
        <p className="text-xs text-cinza-texto">Entra no fim da lista; arraste para mudar a ordem.</p>
        <button type="submit" disabled={enviando || nome.trim().length < 2} className={cn(estiloBotaoEscuro, "h-10")}>
          {enviando ? "Salvando…" : "Adicionar"}
        </button>
      </form>
    </Dialogo>
  );
}

function EditarOpcao({
  opcao,
  outras,
  comGrupo,
  aoFechar,
}: {
  opcao: OpcaoAdmin;
  outras: OpcaoAdmin[];
  comGrupo: boolean;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(opcao.nome);
  const [grupo, setGrupo] = useState(opcao.grupo ?? "");
  const [destino, setDestino] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function executar(chamada: Promise<{ ok: boolean; mensagem?: string }>, sucesso: string) {
    setEnviando(true);
    const resposta = await chamada;
    setEnviando(false);
    if (!resposta.ok) return toast.error(resposta.mensagem ?? "Não foi possível concluir.");
    toast.success(sucesso);
    aoFechar();
    router.refresh();
  }

  const mudou = nome.trim() !== opcao.nome || (comGrupo && (grupo.trim() || null) !== opcao.grupo);
  const nomeDestino = outras.find((o) => o.id === destino)?.nome;

  return (
    <Dialogo titulo={`Editar “${opcao.nome}”`} subtitulo={`${opcao.ongs} ${opcao.ongs === 1 ? "ONG usa" : "ONGs usam"}`} aoFechar={aoFechar}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (mudou) executar(chamarAdmin("PATCH", `listas/${opcao.id}`, { nome, ...(comGrupo ? { grupo } : {}) }), "Alterações salvas");
        }}
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          Nome
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} className={estiloCampoAdmin} />
        </label>
        {comGrupo && (
          <label className="flex flex-col gap-1.5 text-xs font-semibold">
            Grupo
            <input value={grupo} onChange={(e) => setGrupo(e.target.value)} maxLength={40} className={estiloCampoAdmin} />
          </label>
        )}
        <p className="text-xs text-cinza-texto">Renomear não mexe nas ONGs: elas guardam a chave, que não muda.</p>
        <button type="submit" disabled={enviando || !mudou || nome.trim().length < 2} className={cn(estiloBotaoEscuro, "h-10")}>
          Salvar
        </button>
      </form>

      <div className="flex flex-col gap-2 border-t border-cinza-linha pt-4">
        <span className="text-xs font-semibold">Unificar com outro</span>
        <div className="flex gap-2">
          <select value={destino} onChange={(e) => setDestino(e.target.value)} aria-label="Unificar com" className={estiloCampoAdmin}>
            <option value="">Escolha</option>
            {outras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={enviando || !destino}
            onClick={() => executar(chamarAdmin("POST", `listas/${opcao.id}/unificacao`, { destinoId: destino }), `Unificado com “${nomeDestino}”`)}
            className={cn(estiloBotaoClaro, "shrink-0")}
          >
            Unificar
          </button>
        </div>
        <span className="text-xs leading-normal text-cinza-texto">
          As ONGs que usam “{opcao.nome}” passam para {nomeDestino ? `“${nomeDestino}”` : "o escolhido"}, e “{opcao.nome}” sai da lista.
        </span>
      </div>

      <div className="flex gap-2 border-t border-cinza-linha pt-4">
        <button
          type="button"
          disabled={enviando}
          onClick={() =>
            executar(chamarAdmin("PATCH", `listas/${opcao.id}`, { ativa: !opcao.ativa }), opcao.ativa ? "Desativado" : "Reativado")
          }
          className={cn(estiloBotaoClaro, "flex-1")}
        >
          {opcao.ativa ? "Desativar" : "Reativar"}
        </button>
        <button
          type="button"
          disabled={enviando || opcao.ongs > 0}
          title={opcao.ongs > 0 ? "Em uso: unifique com outro em vez de excluir" : undefined}
          onClick={() => executar(chamarAdmin("DELETE", `listas/${opcao.id}`), "Excluído")}
          className={cn(estiloBotaoPerigo, "flex-1")}
        >
          Excluir
        </button>
      </div>
      <span className="text-xs leading-normal text-cinza-texto">
        Desativado some do cadastro e dos filtros, mas continua valendo para quem já usa.
        {opcao.ongs > 0 && " Em uso não se exclui: unifique com outro."}
      </span>
    </Dialogo>
  );
}
