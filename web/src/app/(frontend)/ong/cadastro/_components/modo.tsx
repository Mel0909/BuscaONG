'use client'
import { createContext, useContext, type ReactNode } from "react";

// Os formulários dos passos 3 a 7 servem ao cadastro e ao painel da ONG (O2).
// No cadastro, salvar segue para o próximo passo; no painel, salva e fica na página.

type Modo = "cadastro" | "painel";

const ModoContext = createContext<Modo>("cadastro");

export function ModoPainel({ children }: { children: ReactNode }) {
  return <ModoContext.Provider value="painel">{children}</ModoContext.Provider>;
}

export const useModo = () => useContext(ModoContext);
