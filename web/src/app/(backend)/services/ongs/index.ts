import { auth } from "@/auth";
import prisma from "@/backend/services/db";
import { Prisma } from "@prisma/client";
import { lookupCnpj, type CnpjData } from "@/lib/cnpj";
import { verificarElegibilidade, type MotivoNaoElegivel } from "./elegibilidade";
import { CadastroEmAndamentoError, EmailEmUsoError, OngJaCadastradaError, OngNaoElegivelError } from "./erros";

export * from "./elegibilidade";
export * from "./erros";
export * from "./cadastro";
export * from "./publico";
export * from "./perfil";
export * from "./urgencias";

export async function findOngByCnpj(cnpj: string) {
  return prisma.ong.findUnique({ where: { cnpj } });
}

/**
 * Prazo depois do qual o rascunho de uma conta que nunca confirmou o e-mail deixa de prender o
 * CNPJ. Sem e-mail confirmado não há login, então o rascunho só tem os passos 1 e 2: nada se
 * perde. Evita que um e-mail errado (ou descartável, de quem quer ocupar o CNPJ) trave a ONG.
 */
export const PRAZO_RASCUNHO_SEM_CONFIRMACAO_MS = 60 * 60_000;

// "não confirmado": false, null ou ausente (no MongoDB, `{ not: true }` deixaria o ausente de fora)
const EMAIL_NAO_CONFIRMADO: Prisma.UserWhereInput[] = [
  { emailVerified: false },
  { emailVerified: null },
  { emailVerified: { isSet: false } },
];

/** O rascunho pode ser substituído: a conta dele não existe, ou nunca confirmou o e-mail e já passou o prazo. */
async function rascunhoAbandonado(rascunho: { userId: string }, agora = Date.now()) {
  const dono = await prisma.user.findUnique({ where: { id: rascunho.userId }, select: { emailVerified: true, createdAt: true } });
  return !dono || (dono.emailVerified !== true && dono.createdAt.getTime() < agora - PRAZO_RASCUNHO_SEM_CONFIRMACAO_MS);
}

/**
 * Apaga o rascunho abandonado (a conta cai junto). A condição vai no próprio delete: se a conta
 * confirmou o e-mail no meio do caminho, nada é apagado e o cadastro continua em andamento.
 */
async function liberarRascunhoAbandonado(rascunho: { id: string; userId: string }) {
  try {
    await prisma.user.delete({
      where: {
        id: rascunho.userId,
        createdAt: { lt: new Date(Date.now() - PRAZO_RASCUNHO_SEM_CONFIRMACAO_MS) },
        OR: EMAIL_NAO_CONFIRMADO,
      },
    });
  } catch (error) {
    const naoAchou = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
    // P2025 sem a conta: rascunho órfão, pode apagar; com a conta: ela confirmou, não mexe
    if (!naoAchou || (await prisma.user.findUnique({ where: { id: rascunho.userId } }))) {
      throw naoAchou ? new CadastroEmAndamentoError() : error;
    }
  }
  await prisma.ong.deleteMany({ where: { id: rascunho.id, status: "RASCUNHO" } });
  console.info(`[cadastro] CNPJ liberado: rascunho ${rascunho.id} sem e-mail confirmado`);
}

export type ConsultaCnpj =
  | { status: "JA_CADASTRADO"; cnpj: string }
  // cadastro começado e não publicado: a pessoa pode continuar (login) ou começar de novo
  | { status: "EM_ANDAMENTO"; cnpj: string; receita: CnpjData }
  | { status: "NAO_ELEGIVEL"; cnpj: string; motivo: MotivoNaoElegivel; receita: CnpjData }
  | { status: "ELEGIVEL"; cnpj: string; receita: CnpjData };

/**
 * Passo 1 do cadastro: diz se o CNPJ (já normalizado e com dígito verificador válido)
 * pode criar uma conta. Só conta como "já cadastrado" a ONG publicada (ou suspensa): até
 * aceitar os termos no passo 8, o cadastro é um rascunho que dá para continuar ou recomeçar.
 * Erros de consulta (CnpjNotFoundError, CnpjLookupUnavailableError) sobem para quem chamou.
 */
export async function consultarCnpjParaCadastro(cnpj: string): Promise<ConsultaCnpj> {
  const encontrado = await findOngByCnpj(cnpj);
  if (encontrado && encontrado.status !== "RASCUNHO") {
    return { status: "JA_CADASTRADO", cnpj };
  }
  // rascunho abandonado sem e-mail confirmado não prende o CNPJ (o POST /api/ongs o substitui)
  const existente = encontrado && !(await rascunhoAbandonado(encontrado)) ? encontrado : null;

  const receita = await lookupCnpj(cnpj);
  const elegibilidade = verificarElegibilidade(receita);

  if (!elegibilidade.elegivel) {
    return { status: "NAO_ELEGIVEL", cnpj, motivo: elegibilidade.motivo, receita };
  }

  return { status: existente ? "EM_ANDAMENTO" : "ELEGIVEL", cnpj, receita };
}

export type NovaContaOng = {
  cnpj: string; // normalizado e com dígito verificador válido
  email: string;
  password: string;
  usarEnderecoReceita: boolean;
};

/**
 * Passo 2 do cadastro: cria o usuário (better-auth, perfil ONG, e-mail ainda não verificado)
 * e a Ong em rascunho. O better-auth envia o código de verificação ao criar o usuário.
 * Revalida o CNPJ no servidor: não confia no que o passo 1 mostrou no navegador.
 * Um cadastro existente nunca é substituído por esta operação pública, exceto o rascunho de uma
 * conta que nunca confirmou o e-mail, depois de PRAZO_RASCUNHO_SEM_CONFIRMACAO_MS.
 */
export async function criarContaOng({ cnpj, email, password, usarEnderecoReceita }: NovaContaOng) {
  const rascunho = await findOngByCnpj(cnpj);
  if (rascunho && rascunho.status !== "RASCUNHO") {
    throw new OngJaCadastradaError();
  }
  if (rascunho && !(await rascunhoAbandonado(rascunho))) {
    throw new CadastroEmAndamentoError();
  }

  const receita = await lookupCnpj(cnpj);
  const elegibilidade = verificarElegibilidade(receita);
  if (!elegibilidade.elegivel) {
    throw new OngNaoElegivelError(elegibilidade.motivo);
  }

  // só depois de o CNPJ seguir elegível: libera o rascunho abandonado (e o e-mail dele)
  if (rascunho) await liberarRascunhoAbandonado(rascunho);

  // com requireEmailVerification, o better-auth não dá erro para e-mail repetido: devolve um
  // usuário falso (contra enumeração de e-mails). Por isso a checagem vem antes.
  const emailNormalizado = email.toLowerCase();
  const donoDoEmail = await prisma.user.findUnique({ where: { email: emailNormalizado } });
  if (donoDoEmail) {
    throw new EmailEmUsoError();
  }

  const { user } = await auth.api.signUpEmail({
    body: { name: receita.razaoSocial, email: emailNormalizado, password },
  });

  // garante que o usuário existe mesmo (corrida com outro cadastro no mesmo e-mail)
  if (!(await prisma.user.findUnique({ where: { id: user.id } }))) {
    throw new EmailEmUsoError();
  }

  try {
    const ong = await prisma.ong.create({
      data: {
        cnpj,
        razaoSocial: receita.razaoSocial,
        naturezaJuridica: receita.naturezaJuridica.codigo ?? "",
        situacaoCadastral: receita.situacaoCadastral,
        enderecoReceita: receita.endereco,
        usarEnderecoReceita,
        receitaConsultadaEm: new Date(),
        userId: user.id,
      },
      select: { id: true, cnpj: true, razaoSocial: true, status: true, passoAtual: true },
    });

    return { ong, email: emailNormalizado };
  } catch (error) {
    // sem conta órfã: se a Ong não foi criada, o usuário também não fica
    // (sessões e contas do better-auth caem junto, por onDelete: Cascade)
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new OngJaCadastradaError();
    }
    throw error;
  }
}
