import type { DiaVoluntariado, Turno } from "@/generated/prisma";

// opções do passo 6; os valores são os do enum DiaVoluntariado do Prisma
export const DIAS_VOLUNTARIADO: { valor: DiaVoluntariado; nome: string }[] = [
  { valor: "SEGUNDA", nome: "Segunda" },
  { valor: "TERCA", nome: "Terça" },
  { valor: "QUARTA", nome: "Quarta" },
  { valor: "QUINTA", nome: "Quinta" },
  { valor: "SEXTA", nome: "Sexta" },
  { valor: "SABADO", nome: "Sábado" },
  { valor: "DOMINGO", nome: "Domingo" },
  { valor: "DIAS_UTEIS", nome: "Dias úteis" },
  { valor: "FIM_DE_SEMANA", nome: "Fim de semana" },
  { valor: "TODO_DIA", nome: "Todo dia" },
];

/** Atividade que não está na lista fixa; vem com o texto em `atividadeOutra`. */
export const ATIVIDADE_OUTRA = "outra";

// faixas de cada turno, em horas: [início, fim)
const TURNOS: { turno: Turno; inicio: number; fim: number }[] = [
  { turno: "MANHA", inicio: 0, fim: 12 },
  { turno: "TARDE", inicio: 12, fim: 18 },
  { turno: "NOITE", inicio: 18, fim: 24 },
];

/**
 * Turnos que um horário cobre, para o filtro de voluntariado.
 * Horário livre (sem início e fim) vale para os três.
 * Ex.: 8h–12h → manhã; 14h–19h → tarde e noite.
 */
export function calcularTurnos(inicio: number | null | undefined, fim: number | null | undefined): Turno[] {
  if (inicio == null || fim == null) return TURNOS.map((t) => t.turno);
  return TURNOS.filter((t) => inicio < t.fim && fim > t.inicio).map((t) => t.turno);
}

/** 8, 12 → "8h – 12h"; sem horário → "Horário livre" */
export function formatarHorario(inicio: number | null | undefined, fim: number | null | undefined): string {
  if (inicio == null || fim == null) return "Horário livre";
  return `${inicio}h – ${fim}h`;
}
