import prisma from "@/backend/services/db";
import type { RevisaoImagemData } from "@/backend/schemas";
import type { Prisma } from "@prisma/client";
import { apagarArquivo, urlPublica } from "@/lib/armazenamento";
import { sendEmail } from "@/lib/email";
import { imagemRemovidaEmail } from "@/lib/email/templates/admin";
import { AcaoInvalidaError, NaoEncontradoError } from "./erros";
import { nomeDa } from "./ongs";
import { registrarAcao, type Autor } from "./registro";

// Revisão de imagens (A5). A logo e a capa aparecem no perfil assim que a ONG envia; a equipe
// olha as novas depois e dá "ok" ou remove (com motivo, avisando a ONG). Só perfis publicados.

export type TipoImagemOng = "logo" | "capa";

export type ImagemParaRevisar = {
  ongId: string;
  ong: string;
  pagina: string;
  tipo: TipoImagemOng;
  chave: string;
  url: string;
  atualizadaEm: Date;
};

// "não revisada" = campo ausente, false ou null. No MongoDB, `{ not: true }` do Prisma deixa de
// fora os documentos sem o campo (as imagens de antes da revisão), por isso a lista explícita.
const NAO_REVISADA = [{ isSet: false }, { equals: false }, { equals: null }] as const;
const PENDENTE: Record<TipoImagemOng, Prisma.OngWhereInput> = {
  logo: { logo: { not: null }, OR: NAO_REVISADA.map((f) => ({ logoRevisada: f })) },
  capa: { capa: { not: null }, OR: NAO_REVISADA.map((f) => ({ capaRevisada: f })) },
};

/** Quantas imagens esperam o "ok" (para o número na barra do admin). */
export async function contarImagensParaRevisar(): Promise<number> {
  const [logos, capas] = await Promise.all([
    prisma.ong.count({ where: { status: "PUBLICADA", ...PENDENTE.logo } }),
    prisma.ong.count({ where: { status: "PUBLICADA", ...PENDENTE.capa } }),
  ]);
  return logos + capas;
}

/** Imagens novas de perfis publicados, das mais antigas para as mais novas. */
export async function imagensParaRevisar(limite = 60): Promise<ImagemParaRevisar[]> {
  const ongs = await prisma.ong.findMany({
    where: { status: "PUBLICADA", OR: [PENDENTE.logo, PENDENTE.capa] },
    orderBy: { updatedAt: "asc" },
    take: limite,
    select: { id: true, nomePublico: true, razaoSocial: true, slug: true, logo: true, capa: true, logoRevisada: true, capaRevisada: true, updatedAt: true },
  });

  return ongs.flatMap((ong) =>
    (["logo", "capa"] as const)
      .filter((tipo) => ong[tipo] && (tipo === "logo" ? ong.logoRevisada : ong.capaRevisada) !== true)
      .map((tipo) => ({
        ongId: ong.id,
        ong: nomeDa(ong),
        pagina: `/ong/${ong.slug ?? ong.id}`,
        tipo,
        chave: ong[tipo]!,
        url: urlPublica(ong[tipo]!),
        atualizadaEm: ong.updatedAt,
      }))
  );
}

const IMAGEM_TROCADA = "A ONG trocou esta imagem depois que a página abriu. Recarregue para ver a nova.";

/**
 * "Ok" ou remover a imagem que o admin viu (`chave`). As duas só valem se a ONG ainda estiver com
 * essa imagem; senão, 409. Remover apaga o arquivo do R2, avisa a ONG e vai para o registro.
 */
export async function revisarImagem(autor: NonNullable<Autor>, dados: RevisaoImagemData) {
  const ong = await prisma.ong.findUnique({ where: { id: dados.ongId }, include: { user: { select: { email: true } } } });
  if (!ong) throw new NaoEncontradoError("ONG não encontrada");
  const nome = nomeDa(ong);
  const qual = dados.tipo === "logo" ? "Logo" : "Capa";
  const campoRevisada = dados.tipo === "logo" ? "logoRevisada" : "capaRevisada";

  if (dados.acao === "APROVAR") {
    // sem mexer no updatedAt: o "ok" não muda nada que a ONG edita, então não pode causar
    // conflito (409) num formulário que ela esteja salvando
    const resultado = (await prisma.$runCommandRaw({
      update: "ong",
      updates: [{ q: { _id: { $oid: ong.id }, [dados.tipo]: dados.chave }, u: { $set: { [campoRevisada]: true } } }],
    })) as { n?: number };
    if (!resultado.n) throw new AcaoInvalidaError(IMAGEM_TROCADA);
    await registrarAcao(autor, "APROVOU_IMAGEM", nome, { alvoId: ong.id, motivo: qual });
    return { ok: true };
  }

  const onde: Prisma.OngWhereInput = dados.tipo === "logo" ? { id: ong.id, logo: dados.chave } : { id: ong.id, capa: dados.chave };
  const dadosNovos: Prisma.OngUpdateManyMutationInput =
    dados.tipo === "logo" ? { logo: null, logoRevisada: null } : { capa: null, capaRevisada: null };
  const { count } = await prisma.ong.updateMany({ where: onde, data: dadosNovos });
  if (!count) throw new AcaoInvalidaError(IMAGEM_TROCADA);

  await apagarArquivo(dados.chave).catch((erro) => console.error("[admin] falha ao apagar a imagem removida do R2:", erro));
  await registrarAcao(autor, "REMOVEU_IMAGEM", nome, { alvoId: ong.id, motivo: `${qual}: ${dados.motivo}` });
  await sendEmail(imagemRemovidaEmail(ong.user.email, nome, dados.tipo, dados.motivo)).catch((erro) =>
    console.error("[admin] falha ao avisar a ONG da imagem removida:", erro)
  );
  return { ok: true };
}
