import { auth } from "@/auth";
import prisma from "@/backend/services/db";
import { Prisma } from "@/generated/prisma";
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
  const existente = await findOngByCnpj(cnpj);
  if (existente && existente.status !== "RASCUNHO") {
    return { status: "JA_CADASTRADO", cnpj };
  }

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
  /** a pessoa escolheu "Começar de novo": apaga o rascunho que existir para este CNPJ */
  recomecar: boolean;
};

/**
 * Passo 2 do cadastro: cria o usuário (better-auth, perfil ONG, e-mail ainda não verificado)
 * e a Ong em rascunho. O better-auth envia o código de verificação ao criar o usuário.
 * Revalida o CNPJ no servidor: não confia no que o passo 1 mostrou no navegador.
 * Se já houver um rascunho para o CNPJ, só segue com `recomecar`, e aí o rascunho (com o
 * usuário dele) é apagado antes de criar a conta nova.
 */
export async function criarContaOng({ cnpj, email, password, usarEnderecoReceita, recomecar }: NovaContaOng) {
  const rascunho = await findOngByCnpj(cnpj);
  if (rascunho && rascunho.status !== "RASCUNHO") {
    throw new OngJaCadastradaError();
  }
  if (rascunho && !recomecar) {
    throw new CadastroEmAndamentoError();
  }

  const receita = await lookupCnpj(cnpj);
  const elegibilidade = verificarElegibilidade(receita);
  if (!elegibilidade.elegivel) {
    throw new OngNaoElegivelError(elegibilidade.motivo);
  }

  // com requireEmailVerification, o better-auth não dá erro para e-mail repetido: devolve um
  // usuário falso (contra enumeração de e-mails). Por isso a checagem vem antes.
  const emailNormalizado = email.toLowerCase();
  const donoDoEmail = await prisma.user.findUnique({ where: { email: emailNormalizado } });
  // o e-mail do próprio rascunho que vai ser apagado pode ser usado de novo
  if (donoDoEmail && donoDoEmail.id !== rascunho?.userId) {
    throw new EmailEmUsoError();
  }

  if (rascunho) {
    // a Ong, as sessões e as contas do better-auth caem junto (onDelete: Cascade)
    await prisma.user.delete({ where: { id: rascunho.userId } });
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
