// Prepara o banco: preenche as listas fixas e cria o índice geográfico das ONGs.
// Rodar depois do `prisma db push`, pela raiz: pnpm db:seed
// Pode rodar de novo sem duplicar nada (upsert pelo slug).
import { PrismaClient, TipoLista } from "../src/generated/prisma/index.js";

type Opcao = { slug: string; nome: string };

// listas do protótipo (design/); a partir daqui, quem mantém é o admin
const CAUSAS: Opcao[] = [
  { slug: "orfanatos", nome: "Orfanatos" },
  { slug: "situacao-de-rua", nome: "Situação de rua" },
  { slug: "animais", nome: "Animais" },
  { slug: "idosos", nome: "Idosos" },
  { slug: "pessoas-com-deficiencia", nome: "Pessoas com deficiência" },
  { slug: "saude", nome: "Saúde" },
  { slug: "educacao", nome: "Educação" },
  { slug: "mulheres", nome: "Mulheres" },
  { slug: "meio-ambiente", nome: "Meio ambiente" },
];

const ITENS: Opcao[] = [
  { slug: "fraldas", nome: "Fraldas" },
  { slug: "leite-em-po", nome: "Leite em pó" },
  { slug: "alimentos", nome: "Alimentos" },
  { slug: "material-escolar", nome: "Material escolar" },
  { slug: "roupas-infantis", nome: "Roupas infantis" },
  { slug: "cobertores", nome: "Cobertores" },
  { slug: "higiene", nome: "Higiene" },
  { slug: "brinquedos", nome: "Brinquedos" },
  { slug: "moveis", nome: "Móveis" },
  { slug: "remedios", nome: "Remédios" },
];

// as três primeiras vêm do protótipo; as demais são provisórias, para revisar com o admin
const ATIVIDADES: Opcao[] = [
  { slug: "recreacao", nome: "Recreação" },
  { slug: "reforco-escolar", nome: "Reforço escolar" },
  { slug: "doacao-de-sangue-triagem", nome: "Doação de sangue / triagem" },
  { slug: "cozinha", nome: "Cozinha" },
  { slug: "limpeza-e-manutencao", nome: "Limpeza e manutenção" },
  { slug: "cuidado-com-animais", nome: "Cuidado com animais" },
  { slug: "apoio-administrativo", nome: "Apoio administrativo" },
  { slug: "eventos-e-campanhas", nome: "Eventos e campanhas" },
];

const prisma = new PrismaClient();

// rotas fixas dentro de /ong que não podem virar endereço de ONG (igual a lib/ong/slug.ts)
const RESERVADOS = new Set(["cadastro", "painel", "entrar", "login", "admin", "nova", "minha"]);

async function preencher(tipo: TipoLista, opcoes: Opcao[]) {
  for (const [ordem, { slug, nome }] of opcoes.entries()) {
    await prisma.opcaoLista.upsert({
      where: { tipo_slug: { tipo, slug } },
      // não sobrescreve nome nem ordem que o admin tenha mudado
      update: {},
      create: { tipo, slug, nome, ordem },
    });
  }
  console.info(`${tipo}: ${opcoes.length} opções`);
}

try {
  await preencher(TipoLista.CAUSA, CAUSAS);
  await preencher(TipoLista.ITEM, ITENS);
  await preencher(TipoLista.ATIVIDADE, ATIVIDADES);

  // posição pública das ONGs salvas antes de ela existir: a real, ou sorteada a 150-400 m dela para
  // quem mostra só o bairro (mesma regra de lib/mapa/geo.ts, posicaoAproximada)
  const semPosicaoPublica = await prisma.ong.findMany({
    where: { localizacao: { isSet: true }, localizacaoPublica: { isSet: false } },
    select: { id: true, localizacao: true, mostrarSoBairro: true },
  });
  for (const ong of semPosicaoPublica) {
    const [longitude, latitude] = ong.localizacao!.coordinates;
    let coordinates = [longitude, latitude];
    if (ong.mostrarSoBairro) {
      const sortear = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
      const angulo = sortear() * 2 * Math.PI;
      const dLat = ((0.15 + sortear() * 0.25) / 6371) * (180 / Math.PI);
      const dLng = dLat / Math.cos((latitude * Math.PI) / 180);
      coordinates = [longitude + dLng * Math.cos(angulo), latitude + dLat * Math.sin(angulo)];
    }
    await prisma.ong.update({ where: { id: ong.id }, data: { localizacaoPublica: { type: "Point", coordinates } } });
  }
  if (semPosicaoPublica.length) console.info(`${semPosicaoPublica.length} ONG(s) ganharam a posição pública`);

  // o Prisma não declara índice 2dsphere no schema; o mapa busca ONGs por área com ele.
  // As consultas públicas usam só a posição pública (a real fica sem índice geográfico).
  await prisma.$runCommandRaw({
    createIndexes: "ong",
    indexes: [{ key: { localizacaoPublica: "2dsphere" }, name: "localizacaoPublica_2dsphere" }],
  });
  console.info("índice localizacaoPublica_2dsphere pronto");

  // ONGs publicadas antes de existir o endereço da página (/ong/<slug>) ganham o slug
  // (mesma regra de lib/ong/slug.ts: nome sem acento, minúsculo, com hífens; repetido ganha -2, -3...)
  const semSlug = await prisma.ong.findMany({
    where: { status: { not: "RASCUNHO" }, OR: [{ slug: null }, { slug: { isSet: false } }] },
    select: { id: true, nomePublico: true, razaoSocial: true },
  });
  for (const ong of semSlug) {
    const base =
      (ong.nomePublico ?? ong.razaoSocial)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " e ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
        .replace(/-+$/, "") || "ong";
    let slug = base;
    for (let n = 2; RESERVADOS.has(slug) || /^[a-f0-9]{24}$/.test(slug) || (await prisma.ong.findFirst({ where: { slug }, select: { id: true } })); n++) {
      slug = `${base}-${n}`;
    }
    await prisma.ong.update({ where: { id: ong.id }, data: { slug } });
  }
  if (semSlug.length) console.info(`${semSlug.length} ONG(s) ganharam o endereço da página`);

  // slug único entre as ONGs que têm slug (o @unique do Prisma valeria também para os rascunhos
  // sem slug, e o MongoDB não aceitaria vários vazios); garante que duas ONGs publicando ao mesmo
  // tempo com o mesmo nome não fiquem com o mesmo endereço
  await prisma.$runCommandRaw({
    createIndexes: "ong",
    indexes: [{ key: { slug: 1 }, name: "slug_unico", unique: true, partialFilterExpression: { slug: { $type: "string" } } }],
  });
  console.info("índice slug_unico pronto");
} finally {
  await prisma.$disconnect();
}
