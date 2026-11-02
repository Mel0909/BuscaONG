import prisma from "@/backend/services/db";
import type { NovaDenunciaData } from "@/backend/schemas";

// Denúncia de perfil (P5.1). A denúncia não tira a ONG do ar: fica guardada para a
// equipe analisar. A ONG não vê quem denunciou.

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
