import prisma from "@/backend/services/db";
import { CnpjLookupUnavailableError, CnpjNotFoundError, lookupCnpj } from "@/lib/cnpj";
import { aplicarConsultaReceita, nomeDa } from "./ongs";
import { registrarAcao } from "./registro";

// Revalidação periódica do CNPJ (rotina diária da Vercel, GET /api/cron/revalidacao-cnpj).
// Cada rodada consulta as ONGs cuja consulta à Receita é a mais antiga, uma por vez, e só escreve
// no registro de ações (como "sistema") quando algo muda. Rodar duas vezes não faz mal: a segunda
// rodada já pega as próximas da fila.

/** Uma ONG volta a ser consultada depois deste intervalo. */
export const INTERVALO_REVALIDACAO_DIAS = 30;
/** Quantas ONGs cada rodada consulta (cabe folgado no tempo máximo de uma função da Vercel). */
export const ONGS_POR_RODADA = 10;
/** Pausa entre consultas, para não sobrecarregar as APIs públicas de CNPJ. */
export const PAUSA_ENTRE_CONSULTAS_MS = 1100;

export type ResultadoRevalidacao = {
  consultadas: number;
  mudaram: number;
  naoEncontradas: number;
  /** a Receita (as três APIs) não respondeu: a rodada parou e o resto fica para a próxima */
  interrompida: boolean;
};

type Opcoes = { agora?: Date; limite?: number; esperar?: (ms: number) => Promise<void> };

const esperarDeVerdade = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function revalidarCnpjsAntigos({
  agora = new Date(),
  limite = ONGS_POR_RODADA,
  esperar = esperarDeVerdade,
}: Opcoes = {}): Promise<ResultadoRevalidacao> {
  const corte = new Date(agora.getTime() - INTERVALO_REVALIDACAO_DIAS * 86_400_000);
  // rascunhos ficam de fora: o CNPJ deles é consultado de novo ao criar a conta e ao publicar
  const ongs = await prisma.ong.findMany({
    where: { status: { not: "RASCUNHO" }, receitaConsultadaEm: { lt: corte } },
    orderBy: { receitaConsultadaEm: "asc" },
    take: limite,
    select: { id: true, cnpj: true, nomePublico: true, razaoSocial: true, situacaoCadastral: true, naturezaJuridica: true },
  });

  const resultado: ResultadoRevalidacao = { consultadas: 0, mudaram: 0, naoEncontradas: 0, interrompida: false };
  for (const [i, ong] of ongs.entries()) {
    if (i > 0) await esperar(PAUSA_ENTRE_CONSULTAS_MS);
    try {
      const receita = await lookupCnpj(ong.cnpj);
      const { mudou, motivo } = await aplicarConsultaReceita(ong, receita, agora);
      resultado.consultadas += 1;
      if (mudou) {
        resultado.mudaram += 1;
        await registrarAcao(null, "REVALIDOU_CNPJ", nomeDa(ong), { alvoId: ong.id, motivo });
      }
    } catch (erro) {
      if (erro instanceof CnpjLookupUnavailableError) {
        resultado.interrompida = true;
        break;
      }
      if (!(erro instanceof CnpjNotFoundError)) throw erro;
      // não some da fila para sempre, mas também não é consultada todo dia; o admin vê no registro
      resultado.consultadas += 1;
      resultado.naoEncontradas += 1;
      await prisma.ong.update({ where: { id: ong.id }, data: { receitaConsultadaEm: agora } });
      await registrarAcao(null, "REVALIDOU_CNPJ", nomeDa(ong), { alvoId: ong.id, motivo: "CNPJ não encontrado na Receita" });
    }
  }
  return resultado;
}
