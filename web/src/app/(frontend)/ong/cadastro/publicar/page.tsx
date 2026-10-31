import { buscarOpcoes } from "@/backend/services/listas";
import type { Ong } from "@/generated/prisma";
import { urlPublica } from "@/lib/armazenamento";
import { PassoPublicar, type ItemVerificacao } from "../_components/PassoPublicar";
import { rotaDoPasso } from "../_components/passos";
import { carregarPasso } from "../_utils/carregarPasso";

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`;

function verificacao(ong: Ong): ItemVerificacao[] {
  const { whatsapp, email } = ong.contatos ?? {};
  const totalItens = ong.itens.length + ong.itensLivres.length;
  const temHorarios = ong.aceitaVoluntarios && ong.horariosVoluntariado.length > 0;

  return [
    // garantidos: o CNPJ foi validado no passo 1 e só há sessão com e-mail confirmado
    { texto: "CNPJ ativo e de entidade sem fins lucrativos", ok: true },
    { texto: "E-mail confirmado", ok: true },
    { texto: "Localização no mapa", ok: !!ong.localizacao, rota: rotaDoPasso(3) },
    {
      texto: whatsapp?.visivel ? "WhatsApp informado" : email?.visivel ? "E-mail de contato informado" : "Contato visível",
      ok: !!(whatsapp?.visivel || email?.visivel),
      rota: rotaDoPasso(4),
    },
    {
      texto: `${plural(ong.causas.length, "causa", "causas")} e ${plural(totalItens, "item", "itens")}`,
      ok: ong.causas.length > 0 && totalItens > 0,
      rota: rotaDoPasso(5),
    },
    {
      texto: temHorarios ? "Horários de voluntariado" : "Sem horários de voluntariado (opcional)",
      ok: temHorarios,
      opcional: !temHorarios,
    },
    { texto: "Nome público e descrição", ok: !!(ong.nomePublico && ong.descricaoCurta), rota: rotaDoPasso(7) },
  ];
}

// passo 8 de 8
export default async function CadastroPublicarPage() {
  const { ong } = await carregarPasso(8);

  const [causas, itensDaLista] = await Promise.all([
    buscarOpcoes("CAUSA", ong.causas.slice(0, 1)),
    buscarOpcoes("ITEM", ong.itens),
  ]);
  // na ordem em que a ONG escolheu; depois os itens fora da lista
  const nomesItens = [
    ...ong.itens.map((slug) => itensDaLista.find((i) => i.slug === slug)?.nome).filter((n): n is string => !!n),
    ...ong.itensLivres.map((i) => i.nome),
  ];
  const local = ong.endereco?.bairro || ong.endereco?.municipio;

  return (
    <PassoPublicar
      status={ong.status}
      verificacao={verificacao(ong)}
      cartao={{
        nome: ong.nomePublico ?? ong.razaoSocial,
        logoUrl: ong.logo ? urlPublica(ong.logo) : null,
        subtitulo: [causas[0]?.nome, local].filter(Boolean).join(" · "),
        itens: nomesItens.slice(0, 3),
      }}
    />
  );
}
