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

  // o Prisma não declara índice 2dsphere no schema; o mapa vai buscar ONGs por área com ele
  await prisma.$runCommandRaw({
    createIndexes: "ong",
    indexes: [{ key: { localizacao: "2dsphere" }, name: "localizacao_2dsphere" }],
  });
  console.info("índice localizacao_2dsphere pronto");
} finally {
  await prisma.$disconnect();
}
