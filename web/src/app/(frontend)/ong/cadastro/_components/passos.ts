// os 8 passos do cadastro da ONG (docs/buscaong.md §4); só os implementados têm rota
export const PASSOS = [
  { numero: 1, nome: "CNPJ", rota: "/ong/cadastro" },
  { numero: 2, nome: "Criar acesso", rota: "/ong/cadastro/acesso" },
  { numero: 3, nome: "Localização no mapa", rota: "/ong/cadastro/localizacao" },
  { numero: 4, nome: "Contatos e redes", rota: null },
  { numero: 5, nome: "Causas e itens", rota: null },
  { numero: 6, nome: "Horários de voluntariado", rota: null },
  { numero: 7, nome: "Foto e descrição", rota: null },
  { numero: 8, nome: "Prévia e publicar", rota: null },
] as const;

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
