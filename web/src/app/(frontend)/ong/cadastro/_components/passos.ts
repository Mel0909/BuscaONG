// os 8 passos do cadastro da ONG (docs/buscaong.md §4)
export const PASSOS = [
  { numero: 1, nome: "CNPJ", rota: "/ong/cadastro" },
  { numero: 2, nome: "Criar acesso", rota: "/ong/cadastro/acesso" },
  { numero: 3, nome: "Localização no mapa", rota: "/ong/cadastro/localizacao" },
  { numero: 4, nome: "Contatos e redes", rota: "/ong/cadastro/contatos" },
  { numero: 5, nome: "Causas e itens", rota: "/ong/cadastro/causas-itens" },
  { numero: 6, nome: "Horários de voluntariado", rota: "/ong/cadastro/voluntariado" },
  { numero: 7, nome: "Foto e descrição", rota: "/ong/cadastro/apresentacao" },
  { numero: 8, nome: "Prévia e publicar", rota: "/ong/cadastro/publicar" },
] as const;

/** Rota de um passo (1 a 8). */
export function rotaDoPasso(numero: number): string {
  return PASSOS[Math.min(Math.max(numero, 1), PASSOS.length) - 1].rota;
}

/** Número do passo da rota atual (1 quando não reconhece). */
export function passoDaRota(pathname: string): number {
  const passo = PASSOS.find((p) => p.rota === pathname);
  return passo?.numero ?? 1;
}

// texto do rodapé da barra lateral em cada passo (protótipo)
export const AVISO_LATERAL: Record<number, string> = {
  1: "Sem fila de aprovação. Validamos o CNPJ automaticamente na Receita Federal.",
};
export const AVISO_LATERAL_PADRAO = "Seu progresso fica salvo. Dá para sair e voltar depois.";
