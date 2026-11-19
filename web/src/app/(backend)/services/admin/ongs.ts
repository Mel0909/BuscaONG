import prisma from "@/backend/services/db";
import { avisarDenunciantes, resolverDenuncias, textoDoGrupo } from "@/backend/services/denuncias";
import type { FiltroOngsAdmin } from "@/backend/schemas";
import type { MotivoDenuncia, Ong, OngStatus, Prisma } from "@/generated/prisma";
import { lookupCnpj } from "@/lib/cnpj";
import { NATUREZAS_RECUSADAS, naturezaAceita } from "@/lib/cnpj/naturezas";
import { nomeDoMotivo } from "@/lib/denuncia/motivos";
import { sendEmail } from "@/lib/email";
import { reativacaoOngEmail, suspensaoOngEmail } from "@/lib/email/templates/admin";
import { urgenciaAtiva } from "@/lib/ong/urgencia";
import { capitalizarNome, formatarNaturezaJuridica } from "@/utils/formatters/receita";
import { normalizarChave } from "@/utils/formatters/texto";
import { formatCnpj } from "@/utils/validations/cnpj";
import { formatarWhatsapp } from "@/utils/validations/contatos";
import { AcaoInvalidaError, NaoEncontradoError } from "./erros";
import { registrarAcao, type Autor } from "./registro";

// Gestão de ONGs (A1). O admin não edita perfis: vê, suspende, reativa, exclui e revalida o CNPJ.
// Toda ação vai para o registro (A3).

export const nomeDa = (ong: Pick<Ong, "nomePublico" | "razaoSocial">) => ong.nomePublico ?? capitalizarNome(ong.razaoSocial);

/** Cidade declarada (passo 3) diferente da que está na Receita: sinal para a auditoria, sem bloquear. */
function cidadeDiferente(ong: Pick<Ong, "endereco" | "enderecoReceita">) {
  const receita = ong.enderecoReceita?.municipio;
  const declarada = ong.endereco?.municipio;
  return !!receita && !!declarada && normalizarChave(receita) !== normalizarChave(declarada);
}

const situacaoComProblema = (ong: Pick<Ong, "situacaoCadastral">) => ong.situacaoCadastral.toUpperCase() !== "ATIVA";
/** Situação diferente de ativa, ou natureza que não pode se cadastrar (pode mudar numa revalidação). */
const cnpjComProblema = (ong: Pick<Ong, "situacaoCadastral" | "naturezaJuridica">) =>
  situacaoComProblema(ong) || !naturezaAceita(ong.naturezaJuridica);
/** O mesmo, como filtro do banco (filtro "CNPJ com problema" do A1). */
const ONDE_CNPJ_COM_PROBLEMA: Prisma.OngWhereInput = {
  OR: [
    { situacaoCadastral: { not: "ATIVA" } },
    { NOT: { naturezaJuridica: { startsWith: "3" } } },
    { naturezaJuridica: { in: Object.keys(NATUREZAS_RECUSADAS) } },
  ],
};

/** Contagem de denúncias abertas por ONG. */
async function denunciasAbertasPorOng(ongIds?: string[]) {
  const grupos = await prisma.denuncia.groupBy({
    by: ["ongId"],
    where: { status: "ABERTA", ...(ongIds ? { ongId: { in: ongIds } } : {}) },
    _count: { _all: true },
  });
  return new Map(grupos.map((g) => [g.ongId, g._count._all]));
}

export type LinhaOngAdmin = {
  id: string;
  nome: string;
  cnpj: string;
  cidade: string | null;
  status: OngStatus;
  revisar: boolean;
  urgencias: number;
  denuncias: number;
};

export async function contarOngsAdmin(): Promise<Record<FiltroOngsAdmin, number>> {
  const [todas, ativas, suspensas, rascunhos, cnpj, denunciadas] = await Promise.all([
    prisma.ong.count({ where: { status: { not: "RASCUNHO" } } }),
    prisma.ong.count({ where: { status: "PUBLICADA" } }),
    prisma.ong.count({ where: { status: "SUSPENSA" } }),
    prisma.ong.count({ where: { status: "RASCUNHO" } }),
    prisma.ong.count({ where: { AND: [{ status: { not: "RASCUNHO" } }, ONDE_CNPJ_COM_PROBLEMA] } }),
    denunciasAbertasPorOng().then((m) => m.size),
  ]);
  return { todas, ativas, suspensas, cnpj, denunciadas, rascunhos };
}

/** Lista do A1. "Todas" não inclui rascunhos (cadastro não terminado), que têm filtro próprio. */
export async function listarOngsAdmin(filtro: FiltroOngsAdmin, busca: string, agora = new Date()): Promise<LinhaOngAdmin[]> {
  const onde: Prisma.OngWhereInput[] = [];
  if (filtro === "ativas") onde.push({ status: "PUBLICADA" });
  else if (filtro === "suspensas") onde.push({ status: "SUSPENSA" });
  else if (filtro === "rascunhos") onde.push({ status: "RASCUNHO" });
  else onde.push({ status: { not: "RASCUNHO" } });
  if (filtro === "cnpj") onde.push(ONDE_CNPJ_COM_PROBLEMA);
  if (filtro === "denunciadas") onde.push({ id: { in: [...(await denunciasAbertasPorOng()).keys()] } });

  if (busca) {
    const digitos = busca.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
    onde.push({
      OR: [
        { nomePublico: { contains: busca, mode: "insensitive" } },
        { razaoSocial: { contains: busca, mode: "insensitive" } },
        { endereco: { is: { municipio: { contains: busca, mode: "insensitive" } } } },
        ...(digitos.length >= 4 ? [{ cnpj: { contains: digitos } }] : []),
      ],
    });
  }

  const ongs = await prisma.ong.findMany({
    where: { AND: onde },
    orderBy: [{ nomePublico: "asc" }, { razaoSocial: "asc" }],
    take: 300,
    select: {
      id: true,
      nomePublico: true,
      razaoSocial: true,
      cnpj: true,
      status: true,
      situacaoCadastral: true,
      naturezaJuridica: true,
      endereco: true,
      enderecoReceita: true,
      urgencias: true,
    },
  });
  const denuncias = await denunciasAbertasPorOng(ongs.map((o) => o.id));

  return ongs.map((ong) => {
    const abertas = denuncias.get(ong.id) ?? 0;
    return {
      id: ong.id,
      nome: nomeDa(ong),
      cnpj: formatCnpj(ong.cnpj),
      cidade: ong.endereco?.municipio ?? (ong.enderecoReceita?.municipio ? capitalizarNome(ong.enderecoReceita.municipio) : null),
      status: ong.status,
      revisar: ong.status !== "RASCUNHO" && (cnpjComProblema(ong) || abertas > 0 || cidadeDiferente(ong)),
      urgencias: ong.urgencias.filter((u) => urgenciaAtiva(u, agora)).length,
      denuncias: abertas,
    };
  });
}

export type LinhaContato = { rotulo: string; valor: string; acao: "copiar" | "abrir"; href?: string; marca?: "interno" | "oculto" };

export type FichaOngAdmin = {
  id: string;
  nome: string;
  razaoSocial: string;
  cnpj: string;
  status: OngStatus;
  suspensao: { motivo: string; em: Date; adminEmail: string } | null;
  /** caminho da página pública, quando publicada */
  pagina: string | null;
  whatsapp: string | null;
  contatos: LinhaContato[];
  comparacao: { campo: string; receita: string; declarado: string; diferente: boolean; problema: boolean }[];
  receitaConsultadaEm: Date;
  sinais: string[];
  criadaEm: Date;
  publicadaEm: Date | null;
};

export async function fichaOngAdmin(id: string): Promise<FichaOngAdmin | null> {
  const ong = await prisma.ong.findUnique({ where: { id }, include: { user: { select: { email: true } } } });
  if (!ong) return null;

  const c = ong.contatos;
  const contatos: LinhaContato[] = [];
  const marca = (visivel: boolean) => (visivel ? undefined : ("oculto" as const));
  if (c?.whatsapp) contatos.push({ rotulo: "WhatsApp", valor: formatarWhatsapp(c.whatsapp.valor), acao: "copiar", marca: marca(c.whatsapp.visivel) });
  if (c?.email) contatos.push({ rotulo: "E-mail contato", valor: c.email.valor, acao: "copiar", marca: marca(c.email.visivel) });
  contatos.push({ rotulo: "E-mail acesso", valor: ong.user.email, acao: "copiar", marca: "interno" });
  if (c?.site) contatos.push({ rotulo: "Site", valor: c.site.valor, acao: "abrir", href: c.site.valor, marca: marca(c.site.visivel) });
  if (c?.instagram) {
    const usuario = c.instagram.valor.replace(/^@/, "");
    contatos.push({ rotulo: "Instagram", valor: c.instagram.valor, acao: "abrir", href: `https://instagram.com/${usuario}`, marca: marca(c.instagram.visivel) });
  }

  const receita = ong.enderecoReceita;
  const cidadeReceita = receita?.municipio ? `${capitalizarNome(receita.municipio)}/${receita.uf ?? ""}` : "—";
  const cidadeDeclarada = ong.endereco ? `${ong.endereco.municipio}/${ong.endereco.uf}` : "—";
  const situacao = capitalizarNome(ong.situacaoCadastral || "—");

  const denuncias = await prisma.denuncia.groupBy({
    by: ["motivo"],
    where: { ongId: ong.id, status: "ABERTA" },
    _count: { _all: true },
  });

  const sinais: string[] = [];
  if (situacaoComProblema(ong)) sinais.push(`CNPJ com situação “${situacao}” na Receita (consulta de ${ong.receitaConsultadaEm.toLocaleDateString("pt-BR")})`);
  if (!naturezaAceita(ong.naturezaJuridica)) {
    const recusada = NATUREZAS_RECUSADAS[ong.naturezaJuridica];
    sinais.push(recusada ? `Natureza jurídica de ${recusada}, que não é ONG` : "Natureza jurídica com fins lucrativos");
  }
  for (const d of denuncias) {
    const n = d._count._all;
    sinais.push(`${n} ${n === 1 ? "denúncia" : "denúncias"}: “${nomeDoMotivo(d.motivo)}”`);
  }
  if (cidadeDiferente(ong)) sinais.push("Cidade declarada diferente da que está na Receita");
  if (!ong.usarEnderecoReceita) sinais.push("A ONG disse no cadastro que o endereço da Receita mudou");

  return {
    id: ong.id,
    nome: nomeDa(ong),
    razaoSocial: ong.razaoSocial,
    cnpj: formatCnpj(ong.cnpj),
    status: ong.status,
    suspensao: ong.suspensao ?? null,
    pagina: ong.status === "PUBLICADA" ? `/ong/${ong.slug ?? ong.id}` : null,
    whatsapp: c?.whatsapp?.valor ?? null,
    contatos,
    comparacao: [
      { campo: "Situação", receita: situacao, declarado: "—", diferente: false, problema: situacaoComProblema(ong) },
      {
        campo: "Natureza",
        receita: formatarNaturezaJuridica(ong.naturezaJuridica) ?? "—",
        declarado: "—",
        diferente: false,
        problema: !naturezaAceita(ong.naturezaJuridica),
      },
      { campo: "Cidade", receita: cidadeReceita, declarado: cidadeDeclarada, diferente: cidadeDiferente(ong), problema: false },
    ],
    receitaConsultadaEm: ong.receitaConsultadaEm,
    sinais,
    criadaEm: ong.createdAt,
    publicadaEm: ong.publicadaEm,
  };
}

async function ongComEmail(id: string) {
  const ong = await prisma.ong.findUnique({ where: { id }, include: { user: { select: { email: true } } } });
  if (!ong) throw new NaoEncontradoError("ONG não encontrada");
  return ong;
}

/** Suspende (sai do mapa na hora) ou reativa. A ONG é avisada por e-mail. */
export async function alterarStatusOng(autor: NonNullable<Autor>, id: string, status: "SUSPENSA" | "PUBLICADA", motivo: string) {
  const ong = await ongComEmail(id);
  const nome = nomeDa(ong);

  if (status === "SUSPENSA") {
    if (ong.status === "SUSPENSA") throw new AcaoInvalidaError("A ONG já está suspensa.");
    await prisma.ong.update({
      where: { id },
      data: { status: "SUSPENSA", suspensao: { motivo, em: new Date(), adminEmail: autor.email } },
    });
    const denuncias = await resolverDenuncias(id, "COM_ACAO", `ONG suspensa: ${motivo}`);
    await registrarAcao(autor, "SUSPENDEU_ONG", nome, {
      alvoId: id,
      motivo: denuncias.total ? `${motivo} · ${denuncias.total} ${denuncias.total === 1 ? "denúncia" : "denúncias"}` : motivo,
    });
    await sendEmail(suspensaoOngEmail(ong.user.email, nome, motivo)).catch((erro) =>
      console.error("[admin] falha ao avisar a ONG da suspensão:", erro)
    );
    await avisarDenunciantes(denuncias.emails, nome, "suspensa");
  } else {
    if (ong.status !== "SUSPENSA") throw new AcaoInvalidaError("Só dá para reativar uma ONG suspensa.");
    // quem foi suspensa antes de publicar volta para o rascunho
    const volta = ong.publicadaEm ? "PUBLICADA" : "RASCUNHO";
    await prisma.ong.update({ where: { id }, data: { status: volta, suspensao: null } });
    await registrarAcao(autor, "REATIVOU_ONG", nome, { alvoId: id, motivo });
    if (volta === "PUBLICADA") {
      await sendEmail(reativacaoOngEmail(ong.user.email, nome)).catch((erro) =>
        console.error("[admin] falha ao avisar a ONG da reativação:", erro)
      );
    }
  }

  return fichaOngAdmin(id);
}

/**
 * Exclui a ONG e a conta dela (a Ong, as denúncias, sessões e contas caem junto, por onDelete: Cascade).
 * O registro guarda o nome da ONG, porque ela deixa de existir.
 */
export async function excluirOng(autor: NonNullable<Autor>, id: string, motivo: string) {
  const ong = await ongComEmail(id);
  const nome = nomeDa(ong);
  const denuncias = await prisma.denuncia.findMany({ where: { ongId: id, status: "ABERTA" }, select: { email: true } });

  await prisma.user.delete({ where: { id: ong.userId } });
  await registrarAcao(autor, "EXCLUIU_ONG", nome, { alvoId: id, motivo: `${motivo} · CNPJ ${formatCnpj(ong.cnpj)}` });
  await avisarDenunciantes(denuncias.map((d) => d.email), nome, "excluida");
  return { id };
}

/** Consulta o CNPJ de novo na Receita e guarda a situação, a natureza e o endereço atuais. */
export async function revalidarCnpj(autor: NonNullable<Autor>, id: string) {
  const ong = await ongComEmail(id);
  const receita = await lookupCnpj(ong.cnpj);

  await prisma.ong.update({
    where: { id },
    data: {
      situacaoCadastral: receita.situacaoCadastral,
      naturezaJuridica: receita.naturezaJuridica.codigo ?? ong.naturezaJuridica,
      enderecoReceita: receita.endereco,
      receitaConsultadaEm: new Date(),
    },
  });
  const mudou = receita.situacaoCadastral !== ong.situacaoCadastral;
  await registrarAcao(autor, "REVALIDOU_CNPJ", nomeDa(ong), {
    alvoId: id,
    motivo: mudou
      ? `Situação mudou: ${capitalizarNome(ong.situacaoCadastral)} → ${capitalizarNome(receita.situacaoCadastral)}`
      : `Situação: ${capitalizarNome(receita.situacaoCadastral)}`,
  });
  return fichaOngAdmin(id);
}

/** A2: arquiva as denúncias abertas de uma ONG por um motivo, sem agir sobre a ONG. */
export async function arquivarDenuncias(autor: NonNullable<Autor>, ongId: string, motivo: MotivoDenuncia, justificativa: string) {
  const ong = await ongComEmail(ongId);
  const nome = nomeDa(ong);
  const resolvidas = await resolverDenuncias(ongId, "ARQUIVADA", justificativa, motivo);
  if (resolvidas.total > 0) {
    await registrarAcao(autor, "ARQUIVOU_DENUNCIA", nome, {
      alvoId: ongId,
      motivo: `${justificativa} · ${textoDoGrupo(resolvidas.total, motivo)}`,
    });
    await avisarDenunciantes(resolvidas.emails, nome, "arquivada");
  }
  return { arquivadas: resolvidas.total };
}
