import prisma from "@/backend/services/db";
import { Prisma, type Ong, type Urgencia } from "@prisma/client";
import type { UrgenciaData } from "@/backend/schemas";
import { MAX_URGENCIAS, urgenciaAtiva } from "@/lib/ong/urgencia";
import {
  CadastroAlteradoError,
  LimiteUrgenciasError,
  OngNaoEncontradaError,
  OngSuspensaError,
  OpcaoInvalidaError,
  PrazoObrigatorioError,
} from "./erros";
import { itensDaOng } from "./perfil";
import { nomesDasListas } from "./publico";

// Painel da ONG (O2/O3): marcar e encerrar urgências. Sem envio de mensagens: a urgência só muda
// o selo, o pin e o bloco "Urgente agora" da página. As vencidas são descartadas ao salvar.

const DIA_MS = 24 * 60 * 60 * 1000;

async function ongParaUrgencia(userId: string) {
  const ong = await prisma.ong.findUnique({ where: { userId } });
  if (!ong) throw new OngNaoEncontradaError();
  if (ong.status === "SUSPENSA") throw new OngSuspensaError();
  return ong;
}

/** Regrava a lista só se a ONG não mudou desde a leitura (outra aba, suspensão): senão, 409. */
async function gravarUrgencias(ong: Ong, urgencias: Urgencia[]) {
  try {
    await prisma.ong.update({ where: { id: ong.id, status: ong.status, updatedAt: ong.updatedAt }, data: { urgencias } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new CadastroAlteradoError();
    throw error;
  }
}

/**
 * Marca um item da ONG como urgente, ou edita a urgência dele. Editar mantém quando foi marcada
 * ("há 2 h" na página) e, sem `dias`, também o prazo.
 */
export async function marcarUrgencia(userId: string, { item, detalhe, dias }: UrgenciaData) {
  const ong = await ongParaUrgencia(userId);
  const { ITEM } = await nomesDasListas();

  const doItem = itensDaOng(ong, ITEM).find((i) => i.item === item);
  if (!doItem) throw new OpcaoInvalidaError("item");

  const agora = new Date();
  const atual = ong.urgencias.find((u) => u.item === item && urgenciaAtiva(u, agora));
  const outras = ong.urgencias.filter((u) => u.item !== item && urgenciaAtiva(u, agora));
  if (!atual && outras.length >= MAX_URGENCIAS) throw new LimiteUrgenciasError();
  if (!atual && dias === undefined) throw new PrazoObrigatorioError();

  const urgencia = {
    item,
    nome: doItem.nome,
    detalhe,
    criadaEm: atual?.criadaEm ?? agora,
    ate: dias === undefined ? atual!.ate : new Date(agora.getTime() + dias * DIA_MS),
  };
  await gravarUrgencias(ong, [...outras, urgencia]);
  return urgencia;
}

/** Encerra a urgência de um item antes do prazo. Encerrar o que não está urgente não dá erro. */
export async function encerrarUrgencia(userId: string, item: string) {
  const ong = await ongParaUrgencia(userId);
  const agora = new Date();
  const urgencias = ong.urgencias.filter((u) => u.item !== item && urgenciaAtiva(u, agora));
  await gravarUrgencias(ong, urgencias);
  return { urgencias: urgencias.length };
}
