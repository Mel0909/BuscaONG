import type { Metadata } from "next";
import Link from "next/link";
import BuscaOngLogo from "@/components/base/brand/BuscaOngLogo";

export const metadata: Metadata = {
  title: "Termos de uso · BuscaONG",
};

// ⚠️ texto provisório: precisa de revisão (inclusive jurídica) antes do lançamento
const SECOES: { titulo: string; paragrafos: string[] }[] = [
  {
    titulo: "1. O que é o BuscaONG",
    paragrafos: [
      "O BuscaONG é um site que ajuda pessoas a encontrar ONGs próximas e saber do que elas precisam. As doações e o voluntariado são combinados diretamente entre quem quer ajudar e a ONG: o BuscaONG não recebe, guarda nem repassa dinheiro ou itens.",
    ],
  },
  {
    titulo: "2. Quem pode ter um perfil",
    paragrafos: [
      "Só entidades sem fins lucrativos com CNPJ ativo na Receita Federal. A pessoa que cria a conta declara que pode representar a ONG.",
    ],
  },
  {
    titulo: "3. Informações do perfil",
    paragrafos: [
      "A ONG é responsável pelo que publica: endereço, contatos, causas, itens, horários, textos e imagens. As informações devem ser verdadeiras e mantidas atualizadas.",
      "Imagens só podem ser publicadas com autorização de quem aparece nelas. Evitem mostrar o rosto de crianças e adolescentes, em respeito ao Estatuto da Criança e do Adolescente.",
    ],
  },
  {
    titulo: "4. Uso responsável da marcação de urgência",
    paragrafos: [
      "A marcação de urgência destaca uma necessidade real e atual da ONG. Ela deve ser retirada assim que a necessidade for atendida e não pode ser usada como chamada permanente ou para promoção.",
      "O uso indevido da urgência pode levar à retirada da marcação ou à suspensão do perfil.",
    ],
  },
  {
    titulo: "5. Denúncias e suspensão",
    paragrafos: [
      "Qualquer visitante pode denunciar um perfil. A equipe do BuscaONG analisa as denúncias e pode suspender perfis com informações falsas, conteúdo impróprio ou que descumpram estes termos.",
    ],
  },
  {
    titulo: "6. Dados pessoais",
    paragrafos: [
      "O e-mail de acesso e o CNPJ são usados só para a conta e para a verificação; não aparecem no perfil. Os contatos aparecem na página da ONG apenas quando marcados como visíveis. O tratamento dos dados segue a Lei Geral de Proteção de Dados (LGPD).",
    ],
  },
  {
    titulo: "7. Mudanças nestes termos",
    paragrafos: [
      "Estes termos podem mudar. Quando isso acontecer, as ONGs cadastradas serão avisadas pelo e-mail de acesso.",
    ],
  },
];

export default function TermosPage() {
  return (
    <div className="min-h-screen">
      <header className="px-4 py-6 md:px-8">
        <Link href="/" aria-label="Início">
          <BuscaOngLogo />
        </Link>
      </header>

      <main className="mx-auto flex max-w-[720px] flex-col gap-8 px-4 pb-20 pt-6">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.02em]">Termos de uso</h1>
          <p className="rounded-[14px] bg-salvia-clara px-4 py-3 text-sm font-semibold text-musgo-escuro">
            Versão provisória, ainda em revisão.
          </p>
        </div>

        {SECOES.map((secao) => (
          <section key={secao.titulo} className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold">{secao.titulo}</h2>
            {secao.paragrafos.map((p) => (
              <p key={p} className="text-pretty leading-relaxed text-tinta-suave">
                {p}
              </p>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
