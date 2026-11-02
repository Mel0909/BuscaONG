'use client'
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import toast from "react-hot-toast";

import { cn } from "@/lib/utils";
import { linkWhatsapp } from "@/utils/validations/contatos";
import type { FichaOngAdmin } from "@/backend/services/admin";
import { RefreshCw } from "lucide-react";
import { Dialogo } from "@/components/base/Dialogo";
import { chamarAdmin } from "../_actions/api";
import { estiloBotaoClaro, estiloBotaoEscuro, estiloBotaoPerigo, estiloCampoAdmin, Selo, TituloAdmin } from "./ui";

// Ficha da ONG no admin (A1, e A2 ao lado das denúncias): contatos com copiar/abrir, Receita ×
// declarado, sinais para a auditoria e as ações. "Interno" e "oculto" marcam o que não aparece na página.

export function CabecalhoFicha({ ficha, children }: { ficha: FichaOngAdmin; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[19px] font-semibold leading-tight">{ficha.nome}</span>
      <span className="font-mono text-xs text-cinza-texto">{ficha.cnpj}</span>
      {children}
    </div>
  );
}

export function ContatosDaOng({ ficha }: { ficha: FichaOngAdmin }) {
  async function copiar(valor: string) {
    try {
      await navigator.clipboard.writeText(valor);
      toast.success("Copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <>
      <div className="flex gap-2">
        {ficha.pagina ? (
          <a href={ficha.pagina} target="_blank" rel="noreferrer" className={cn(estiloBotaoEscuro, "flex-1")}>
            Ver página pública ↗
          </a>
        ) : (
          <span className={cn(estiloBotaoClaro, "flex-1 cursor-default text-cinza-texto")}>Sem página pública</span>
        )}
        {ficha.whatsapp && (
          <a href={linkWhatsapp(ficha.whatsapp)} target="_blank" rel="noreferrer" className={cn(estiloBotaoClaro, "flex-1")}>
            Abrir no WhatsApp
          </a>
        )}
      </div>
      <div className="flex flex-col">
        {ficha.contatos.map((c) => (
          <div key={c.rotulo} className="grid grid-cols-[110px_1fr_auto] items-center gap-2 border-t border-cinza-linha py-1.5 text-[13px]">
            <span className="text-cinza-texto">{c.rotulo}</span>
            <span className="min-w-0 truncate font-medium">
              {c.valor}{" "}
              {c.marca && <span className="text-[11px] font-medium text-terracota-escura">{c.marca}</span>}
            </span>
            {c.acao === "copiar" ? (
              <button type="button" onClick={() => copiar(c.valor)} className="cursor-pointer text-xs font-semibold text-musgo">
                Copiar
              </button>
            ) : (
              <a href={c.href} target="_blank" rel="noreferrer" className="text-xs font-semibold text-musgo">
                Abrir
              </a>
            )}
          </div>
        ))}
        {ficha.pagina && <span className="pt-1 font-mono text-[11px] text-cinza-texto">{ficha.pagina}</span>}
      </div>
    </>
  );
}

export function ComparacaoReceita({ ficha }: { ficha: FichaOngAdmin }) {
  const router = useRouter();
  const [revalidando, setRevalidando] = useState(false);

  async function revalidar() {
    setRevalidando(true);
    const resposta = await chamarAdmin("POST", `ongs/${ficha.id}/revalidacao`);
    setRevalidando(false);
    if (!resposta.ok) return toast.error(resposta.mensagem);
    toast.success("CNPJ consultado de novo na Receita");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <TituloAdmin>Receita Federal × declarado</TituloAdmin>
        <button
          type="button"
          onClick={revalidar}
          disabled={revalidando}
          className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-musgo disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", revalidando && "animate-spin")} aria-hidden="true" />
          {revalidando ? "Consultando…" : "Revalidar"}
        </button>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-cinza-linha text-[13px]">
        <div className="grid grid-cols-[80px_1fr_1fr] gap-2 bg-cinza-cabecalho px-3 py-2 text-[11px] font-semibold text-cinza-texto">
          <span />
          <span>Receita</span>
          <span>Declarado</span>
        </div>
        {ficha.comparacao.map((linha) => (
          <div
            key={linha.campo}
            className={cn("grid grid-cols-[80px_1fr_1fr] gap-2 border-t border-cinza-linha px-3 py-2", linha.diferente && "bg-terracota-clara/50")}
          >
            <span className="text-cinza-texto">{linha.campo}</span>
            <span className={cn(linha.problema && "font-semibold text-terracota-escura")}>{linha.receita}</span>
            <span className={cn(linha.diferente && "font-semibold text-terracota-escura")}>{linha.declarado}</span>
          </div>
        ))}
      </div>
      <span className="text-[11px] text-cinza-texto">
        Consulta de {new Date(ficha.receitaConsultadaEm).toLocaleDateString("pt-BR")}
      </span>
    </>
  );
}

export function SinaisDaOng({ sinais }: { sinais: string[] }) {
  return (
    <>
      <TituloAdmin>Sinais</TituloAdmin>
      {sinais.length === 0 ? (
        <span className="text-[13px] text-cinza-texto">Nenhum sinal de problema.</span>
      ) : (
        <ul className="flex flex-col gap-1.5 text-[13px] leading-[1.45]">
          {sinais.map((s) => (
            <li key={s}>• {s}</li>
          ))}
        </ul>
      )}
    </>
  );
}

const MOTIVOS = [
  "CNPJ inativo na Receita",
  "ONG encerrada",
  "Cadastro fraudulento",
  "Pedido de dinheiro ou dados pessoais",
  "Conteúdo ou fotos inadequados",
  "Endereço não existe",
];
const OUTRO = "Outro motivo";

/** Motivo obrigatório: lista com os casos comuns e "Outro motivo" com texto. */
export function CampoMotivo({ valor, aoMudar, sugestoes = MOTIVOS }: { valor: string; aoMudar: (v: string) => void; sugestoes?: string[] }) {
  const [escolha, setEscolha] = useState(sugestoes.includes(valor) ? valor : valor ? OUTRO : "");
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold">Motivo (obrigatório)</span>
        <select
          value={escolha}
          onChange={(e) => {
            setEscolha(e.target.value);
            aoMudar(e.target.value === OUTRO ? "" : e.target.value);
          }}
          className={estiloCampoAdmin}
        >
          <option value="" disabled>
            Escolha o motivo
          </option>
          {sugestoes.map((m) => (
            <option key={m}>{m}</option>
          ))}
          <option>{OUTRO}</option>
        </select>
      </label>
      {escolha === OUTRO && (
        <input
          aria-label="Escreva o motivo"
          placeholder="Escreva o motivo"
          value={valor}
          maxLength={300}
          onChange={(e) => aoMudar(e.target.value)}
          className={estiloCampoAdmin}
        />
      )}
    </div>
  );
}

/** Ações da ficha (A1): suspender, reativar e excluir, sempre com motivo. */
export function AcoesOng({ ficha }: { ficha: FichaOngAdmin }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const motivoOk = motivo.trim().length >= 3;

  async function executar(acao: "suspender" | "reativar" | "excluir") {
    if (!motivoOk) return toast.error("Escolha ou escreva o motivo.");
    setEnviando(true);
    const resposta =
      acao === "excluir"
        ? await chamarAdmin("DELETE", `ongs/${ficha.id}`, { motivo })
        : await chamarAdmin("PATCH", `ongs/${ficha.id}`, { status: acao === "suspender" ? "SUSPENSA" : "PUBLICADA", motivo });
    setEnviando(false);
    setConfirmarExclusao(false);
    if (!resposta.ok) return toast.error(resposta.mensagem);

    toast.success(acao === "suspender" ? "ONG suspensa e avisada por e-mail" : acao === "reativar" ? "ONG reativada" : "ONG excluída");
    setMotivo("");
    if (acao === "excluir") router.push("/admin/ongs");
    router.refresh();
  }

  return (
    <div className="mt-auto flex flex-col gap-2.5 border-t border-cinza-linha pt-3">
      {ficha.status === "SUSPENSA" && ficha.suspensao && (
        <p className="text-[13px] leading-normal">
          <Selo tipo="neutro">Suspensa</Selo> em {new Date(ficha.suspensao.em).toLocaleDateString("pt-BR")} por{" "}
          {ficha.suspensao.adminEmail}: {ficha.suspensao.motivo}
        </p>
      )}
      <CampoMotivo valor={motivo} aoMudar={setMotivo} />
      <div className="flex gap-2">
        {ficha.status === "SUSPENSA" ? (
          <button type="button" disabled={enviando} onClick={() => executar("reativar")} className={cn(estiloBotaoEscuro, "h-10 flex-1")}>
            Reativar
          </button>
        ) : (
          <button type="button" disabled={enviando} onClick={() => executar("suspender")} className={cn(estiloBotaoEscuro, "h-10 flex-1")}>
            Suspender
          </button>
        )}
        <button
          type="button"
          disabled={enviando}
          onClick={() => (motivoOk ? setConfirmarExclusao(true) : toast.error("Escolha ou escreva o motivo."))}
          className={cn(estiloBotaoPerigo, "h-10 flex-1")}
        >
          Excluir
        </button>
      </div>
      <span className="text-[11px] leading-normal text-cinza-texto">
        Suspender tira do mapa na hora e avisa a ONG por e-mail com o motivo. Toda ação vai para o registro.
      </span>

      {confirmarExclusao && (
        <Dialogo titulo={`Excluir ${ficha.nome}?`} aoFechar={() => setConfirmarExclusao(false)}>
          <p className="text-[15px] leading-normal text-tinta-suave">
            Apaga a conta de acesso, o perfil e as denúncias desta ONG. Não dá para desfazer. Para tirar do ar sem apagar,
            use Suspender.
          </p>
          <p className="text-sm">
            Motivo: <span className="font-semibold">{motivo}</span>
          </p>
          <div className="flex gap-2">
            <button type="button" disabled={enviando} onClick={() => executar("excluir")} className={cn(estiloBotaoPerigo, "h-11 flex-1")}>
              {enviando ? "Excluindo…" : "Excluir de vez"}
            </button>
            <button type="button" onClick={() => setConfirmarExclusao(false)} className={cn(estiloBotaoClaro, "h-11 flex-1")}>
              Cancelar
            </button>
          </div>
        </Dialogo>
      )}
    </div>
  );
}
