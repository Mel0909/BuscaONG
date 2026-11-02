// Urgência (só visual): a ONG marca um item como urgente no painel (O3), por um prazo.
// Depois do prazo o selo sai sozinho: quem lê confere `ate` com a hora atual.

export const MAX_DETALHE_URGENCIA = 120;
export const PRAZOS_URGENCIA_DIAS = [3, 7, 14] as const;
export const PRAZO_PADRAO_DIAS = 7;
/** Mais que isso e "urgente" deixa de dizer alguma coisa. */
export const MAX_URGENCIAS = 5;

/** Itens livres não têm slug: a urgência guarda "livre:<chave>". */
export const PREFIXO_ITEM_LIVRE = "livre:";
export const itemLivre = (chave: string) => `${PREFIXO_ITEM_LIVRE}${chave}`;

export function urgenciaAtiva(u: { ate: Date | string }, agora = new Date()): boolean {
  return new Date(u.ate).getTime() > agora.getTime();
}

/** "há 5 min", "há 2 h", "há 3 dias" */
export function tempoDesde(data: Date | string, agora = new Date()): string {
  const minutos = Math.max(0, Math.floor((agora.getTime() - new Date(data).getTime()) / 60_000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

/** "até sexta", "até amanhã", "até 12/11" (para o painel) */
export function prazoRestante(ate: Date | string, agora = new Date()): string {
  const fim = new Date(ate);
  const dias = Math.ceil((fim.getTime() - agora.getTime()) / 86_400_000);
  if (dias <= 0) return "encerrada";
  if (dias === 1) return "até amanhã";
  if (dias < 7) return `até ${fim.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).replace("-feira", "")}`;
  return `até ${fim.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}`;
}
