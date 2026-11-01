'use client'
import { useSyncExternalStore } from "react";
import type { CnpjData } from "@/lib/cnpj";

// O que o passo 1 descobre e o passo 2 usa. Fica na memória do navegador (e na sessionStorage,
// para sobreviver a um recarregamento); nada é gravado no servidor antes de a conta existir.
export type DadosCadastro = {
  cnpj: string;
  receita: CnpjData;
  usarEnderecoReceita: boolean;
  /** a pessoa escolheu "Começar de novo" sobre um cadastro em andamento */
  recomecar?: boolean;
  /** preenchido quando a conta já foi criada e falta confirmar o código do e-mail */
  emailPendente?: string;
};

const CHAVE = "buscaong:cadastro-ong";

// store mínimo sobre a sessionStorage, lido com useSyncExternalStore
let cache: DadosCadastro | null | undefined; // undefined = ainda não lido
const ouvintes = new Set<() => void>();

function ler(): DadosCadastro | null {
  try {
    const texto = sessionStorage.getItem(CHAVE);
    return texto ? (JSON.parse(texto) as DadosCadastro) : null;
  } catch {
    return null;
  }
}

function snapshot(): DadosCadastro | null {
  if (cache === undefined) cache = ler();
  return cache;
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

function salvar(novos: DadosCadastro | null) {
  cache = novos;
  try {
    if (novos) sessionStorage.setItem(CHAVE, JSON.stringify(novos));
    else sessionStorage.removeItem(CHAVE);
  } catch {
    // sem sessionStorage (aba privada, bloqueio): segue só com o valor em memória
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

/**
 * Dados do cadastro em andamento.
 * `dados` é undefined até ler a sessionStorage no navegador (no servidor não há sessionStorage).
 */
export function useCadastro() {
  const dados = useSyncExternalStore(inscrever, snapshot, () => undefined);
  return { dados, carregado: dados !== undefined, salvar };
}
