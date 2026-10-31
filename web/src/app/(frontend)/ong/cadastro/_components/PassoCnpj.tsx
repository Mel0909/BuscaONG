'use client'
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { ConsultaCnpj } from "@/backend/services/ongs";
import type { CnpjData } from "@/lib/cnpj";
import { CNPJ_LENGTH, formatCnpj, isValidCnpj, normalizeCnpj } from "@/utils/validations/cnpj";
import { useCadastro } from "./CadastroContext";
import { CartaoReceita } from "./CartaoReceita";

// estados do campo (protótipo O1): digitando, validando, válido, inválido, já cadastrado, não elegível
type Estado =
  | { tipo: "digitando" }
  | { tipo: "invalido" }
  | { tipo: "validando" }
  | { tipo: "elegivel"; cnpj: string; receita: CnpjData }
  | { tipo: "nao-elegivel"; motivo: string; receita: CnpjData }
  | { tipo: "ja-cadastrado" }
  | { tipo: "nao-encontrado" }
  | { tipo: "erro"; mensagem: string };

const MOTIVOS: Record<string, string> = {
  SITUACAO_NAO_ATIVA:
    "Este CNPJ não está com situação ativa na Receita Federal. Só ONGs com CNPJ ativo podem se cadastrar.",
  NATUREZA_COM_FINS_LUCRATIVOS:
    "Este CNPJ não é de uma entidade sem fins lucrativos (associação, fundação ou organização religiosa).",
};

async function consultar(cnpj: string, signal: AbortSignal): Promise<Estado> {
  const response = await fetch(`/api/cnpj/${cnpj}`, { signal });
  const body = await response.json().catch(() => null);

  if (response.ok) {
    const consulta = body as ConsultaCnpj;
    if (consulta.status === "JA_CADASTRADO") return { tipo: "ja-cadastrado" };
    if (consulta.status === "NAO_ELEGIVEL") {
      return { tipo: "nao-elegivel", motivo: consulta.motivo, receita: consulta.receita };
    }
    return { tipo: "elegivel", cnpj: consulta.cnpj, receita: consulta.receita };
  }

  if (response.status === 404) return { tipo: "nao-encontrado" };
  if (response.status === 400) return { tipo: "invalido" };
  return {
    tipo: "erro",
    mensagem: body?.error?.message ?? "Não foi possível consultar o CNPJ agora. Tente de novo.",
  };
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-[14px] border border-borda bg-papel px-4 py-3 text-[15px] leading-normal">
      {children}
    </div>
  );
}

export function PassoCnpj() {
  const router = useRouter();
  const { dados, salvar } = useCadastro();
  const [editado, setEditado] = useState(false);
  const [valorDigitado, setValorDigitado] = useState("");
  const [estadoDigitado, setEstadoDigitado] = useState<Estado>({ tipo: "digitando" });
  const consultaAtual = useRef<AbortController | null>(null);

  // voltando do passo 2 (e antes de digitar de novo): mostra o CNPJ já validado
  const salvo = !editado && dados && !dados.emailPendente ? dados : null;
  const valor = salvo ? formatCnpj(salvo.cnpj) : valorDigitado;
  const estado: Estado = salvo
    ? { tipo: "elegivel", cnpj: salvo.cnpj, receita: salvo.receita }
    : estadoDigitado;
  const setEstado = setEstadoDigitado;

  async function aoDigitar(texto: string) {
    const formatado = formatCnpj(texto);
    setEditado(true);
    setValorDigitado(formatado);
    consultaAtual.current?.abort();

    const cnpj = normalizeCnpj(formatado);
    if (cnpj.length < CNPJ_LENGTH) return setEstado({ tipo: "digitando" });
    if (!isValidCnpj(cnpj)) return setEstado({ tipo: "invalido" });

    const controle = new AbortController();
    consultaAtual.current = controle;
    setEstado({ tipo: "validando" });
    try {
      setEstado(await consultar(cnpj, controle.signal));
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setEstado({ tipo: "erro", mensagem: "Sem conexão. Confira a internet e tente de novo." });
    }
  }

  function continuar(usarEnderecoReceita: boolean) {
    if (estado.tipo !== "elegivel") return;
    salvar({ cnpj: estado.cnpj, receita: estado.receita, usarEnderecoReceita });
    router.push("/ong/cadastro/acesso");
  }

  const statusCampo: Partial<Record<Estado["tipo"], ReactNode>> = {
    validando: <span className="text-tinta-suave">Validando…</span>,
    elegivel: <span className="text-musgo">✓ Válido</span>,
    invalido: <span>✕ Inválido</span>,
  };

  return (
    <div className="flex max-w-[616px] flex-col gap-[26px]">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-4xl">
          Comece pelo CNPJ da sua ONG
        </h1>
        <p className="text-base leading-normal text-tinta-suave">
          Ele fica interno: não aparece no seu perfil público.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="cnpj" className="text-sm font-semibold">
          CNPJ
        </label>
        <div
          className={cn(
            "flex h-14 items-center justify-between gap-3 rounded-[14px] border bg-papel px-4",
            estado.tipo === "elegivel" ? "border-2 border-musgo" : "border-borda",
            estado.tipo === "invalido" && "border-2 border-tinta"
          )}
        >
          <input
            id="cnpj"
            name="cnpj"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="00.000.000/0000-00"
            value={valor}
            onChange={(e) => aoDigitar(e.target.value)}
            aria-invalid={estado.tipo === "invalido"}
            aria-describedby="cnpj-status"
            className="w-full bg-transparent font-mono text-lg font-medium tracking-[.02em] outline-none placeholder:text-borda"
          />
          <span id="cnpj-status" aria-live="polite" className="shrink-0 text-[13px] font-semibold">
            {statusCampo[estado.tipo]}
          </span>
        </div>
        {estado.tipo === "invalido" && (
          <p className="text-[13px] text-tinta-suave">Confira os números: os dígitos verificadores não batem.</p>
        )}
      </div>

      {estado.tipo === "ja-cadastrado" && (
        <Aviso>
          Este CNPJ já tem uma conta no perto.{" "}
          <Link href="/login" className="font-semibold text-musgo underline underline-offset-2">
            Entrar ou recuperar o acesso
          </Link>
        </Aviso>
      )}
      {estado.tipo === "nao-encontrado" && (
        <Aviso>Não encontramos este CNPJ na Receita Federal. Confira os números.</Aviso>
      )}
      {estado.tipo === "erro" && <Aviso>{estado.mensagem}</Aviso>}
      {estado.tipo === "nao-elegivel" && (
        <>
          <Aviso>{MOTIVOS[estado.motivo] ?? "Este CNPJ não pode ser cadastrado."}</Aviso>
          <CartaoReceita receita={estado.receita} elegivel={false} />
        </>
      )}

      {estado.tipo === "elegivel" && (
        <>
          <CartaoReceita receita={estado.receita} elegivel />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => continuar(true)}
              className="h-[52px] cursor-pointer rounded-[15px] bg-musgo px-[26px] text-base font-semibold text-papel transition-colors hover:bg-musgo-escuro"
            >
              Usar esses dados e continuar
            </button>
            <button
              type="button"
              onClick={() => continuar(false)}
              className="h-[52px] cursor-pointer rounded-[15px] bg-salvia-clara px-[22px] text-base font-semibold text-musgo transition-colors hover:bg-salvia"
            >
              O endereço mudou
            </button>
          </div>
        </>
      )}
    </div>
  );
}
