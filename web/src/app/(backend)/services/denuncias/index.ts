import prisma from "@/backend/services/db";
import type { NovaDenunciaData } from "@/backend/schemas";
import type { MotivoDenuncia, StatusDenuncia } from "@/generated/prisma";
import { DENUNCIAS_PARA_TOPO, JANELA_TOPO_MS, nomeDoMotivo } from "@/lib/denuncia/motivos";
import { sendEmail } from "@/lib/email";
import { denunciaDecididaEmail } from "@/lib/email/templates/admin";

// Denúncia de perfil (P5.1) e fila do admin (A2). A denúncia não tira a ONG do ar:
// só ordena a fila. A ONG não vê quem denunciou.

export class PerfilNaoEncontradoError extends Error {
  constructor() {
    super("Perfil não encontrado");
    this.name = "PerfilNaoEncontradoError";
  }
}

export async function criarDenuncia({ ongId, motivo, relato, email }: NovaDenunciaData) {
  const ong = await prisma.ong.findFirst({ where: { id: ongId, status: "PUBLICADA" }, select: { id: true } });
  if (!ong) throw new PerfilNaoEncontradoError();

  return prisma.denuncia.create({
    data: { ongId, motivo, relato, email },
    select: { id: true, motivo: true, createdAt: true },
  });
}

export type GrupoDenuncias = {
  ongId: string;
  ongNome: string;
  motivo: MotivoDenuncia;
  total: number;
  ultima: Date;
  /** violência, ou 3+ denúncias em 7 dias: vai para o topo da fila */
  prioritaria: boolean;
};

/**
 * Fila (A2): denúncias da mesma ONG e do mesmo motivo viram uma linha.
 * Prioritárias primeiro (violência, ou 3 ou mais em 7 dias); depois as mais recentes.
 */
export async function filaDeDenuncias(status: StatusDenuncia, agora = new Date()): Promise<GrupoDenuncias[]> {
  const denuncias = await prisma.denuncia.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      ongId: true,
      motivo: true,
      createdAt: true,
      ong: { select: { nomePublico: true, razaoSocial: true } },
    },
  });

  const grupos = new Map<string, GrupoDenuncias & { recentes: number }>();
  for (const d of denuncias) {
    const chave = `${d.ongId}:${d.motivo}`;
    let grupo = grupos.get(chave);
    if (!grupo) {
      grupo = {
        ongId: d.ongId,
        ongNome: d.ong.nomePublico ?? d.ong.razaoSocial,
        motivo: d.motivo,
        total: 0,
        ultima: d.createdAt,
        prioritaria: false,
        recentes: 0,
      };
      grupos.set(chave, grupo);
    }
    grupo.total++;
    if (agora.getTime() - d.createdAt.getTime() <= JANELA_TOPO_MS) grupo.recentes++;
  }

  return [...grupos.values()]
    .map(({ recentes, ...g }) => ({ ...g, prioritaria: g.motivo === "VIOLENCIA" || recentes >= DENUNCIAS_PARA_TOPO }))
    .sort((a, b) => Number(b.prioritaria) - Number(a.prioritaria) || b.ultima.getTime() - a.ultima.getTime());
}

/** Quantas linhas (ONG + motivo) há em cada aba da fila. */
export async function contarFila(): Promise<Record<StatusDenuncia, number>> {
  const resultado = (await prisma.denuncia.aggregateRaw({
    pipeline: [
      { $group: { _id: { s: "$status", o: "$ongId", m: "$motivo" } } },
      { $group: { _id: "$_id.s", n: { $sum: 1 } } },
    ],
  })) as unknown as { _id: StatusDenuncia; n: number }[];

  const contagem: Record<StatusDenuncia, number> = { ABERTA: 0, ARQUIVADA: 0, COM_ACAO: 0 };
  for (const { _id, n } of resultado) contagem[_id] = n;
  return contagem;
}

/** Relatos de uma linha da fila (sem o e-mail de quem denunciou). */
export async function relatosDoGrupo(ongId: string, motivo: MotivoDenuncia, status: StatusDenuncia) {
  return prisma.denuncia.findMany({
    where: { ongId, motivo, status },
    orderBy: { createdAt: "desc" },
    select: { id: true, relato: true, createdAt: true, resolucao: true, resolvidaEm: true },
  });
}

/** Avisa quem deixou e-mail que houve uma decisão. Falha no envio não desfaz a decisão. */
export async function avisarDenunciantes(emails: (string | null)[], ongNome: string, decisao: "arquivada" | "suspensa" | "excluida") {
  for (const email of new Set(emails.filter((e): e is string => !!e))) {
    await sendEmail(denunciaDecididaEmail(email, ongNome, decisao)).catch((erro) =>
      console.error("[denúncia] falha ao avisar quem denunciou:", erro)
    );
  }
}

/** Marca as denúncias abertas de uma ONG (todas, ou só de um motivo) como resolvidas. */
export async function resolverDenuncias(
  ongId: string,
  status: Exclude<StatusDenuncia, "ABERTA">,
  resolucao: string,
  motivo?: MotivoDenuncia
) {
  const abertas = await prisma.denuncia.findMany({
    where: { ongId, status: "ABERTA", ...(motivo ? { motivo } : {}) },
    select: { id: true, email: true },
  });
  // só as que foram lidas: uma denúncia que chegar entre as duas consultas continua aberta
  // (e quem a fez não fica sem o aviso da decisão)
  await prisma.denuncia.updateMany({
    where: { id: { in: abertas.map((d) => d.id) }, status: "ABERTA" },
    data: { status, resolucao, resolvidaEm: new Date() },
  });
  return { total: abertas.length, emails: abertas.map((d) => d.email) };
}

export const textoDoGrupo = (total: number, motivo: MotivoDenuncia) =>
  `${total} ${total === 1 ? "denúncia" : "denúncias"} “${nomeDoMotivo(motivo)}”`;
