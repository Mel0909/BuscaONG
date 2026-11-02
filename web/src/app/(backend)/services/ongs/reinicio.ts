import { auth } from "@/auth";
import prisma from "@/backend/services/db";
import { CadastroAlteradoError, OngNaoEncontradaError } from "./erros";

async function rascunhoDoUsuario(userId: string) {
  const ong = await prisma.ong.findUnique({ where: { userId } });
  if (!ong) throw new OngNaoEncontradaError();
  if (ong.status !== "RASCUNHO") throw new CadastroAlteradoError();
  return ong;
}

export async function solicitarCodigoReinicio(userId: string, email: string, headers: Headers) {
  await rascunhoDoUsuario(userId);
  await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" }, headers });
}

export async function reiniciarCadastro(userId: string, email: string, codigo: string, headers: Headers) {
  const ong = await rascunhoDoUsuario(userId);
  // O better-auth valida e consome o código. A escrita condicional abaixo protege as corridas.
  const prova = await auth.api.signInEmailOTP({ body: { email, otp: codigo }, headers, returnHeaders: true });
  if (prova.response.user.id !== userId) throw new CadastroAlteradoError();

  const resultado = await prisma.ong.updateMany({
    where: { id: ong.id, userId, status: "RASCUNHO", updatedAt: ong.updatedAt },
    data: {
      updatedAt: new Date(Math.max(Date.now(), ong.updatedAt.getTime() + 1)),
      passoAtual: 3, usarEnderecoReceita: true,
      endereco: { unset: true }, localizacao: { unset: true }, mostrarSoBairro: false,
      contatos: { unset: true }, causas: [], itens: [], itensLivres: [],
      aceitaVoluntarios: false, horariosVoluntariado: [], requisitosVoluntariado: null,
      nomePublico: null, descricaoCurta: null, sobre: null, logo: null, capa: null,
      termosAceitosEm: null, publicadaEm: null,
    },
  });
  if (resultado.count !== 1) throw new CadastroAlteradoError();
  return prova.headers;
}
