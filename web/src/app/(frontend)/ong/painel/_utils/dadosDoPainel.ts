import { itensDaOng, nomesDasListas, urgenciasAtivas } from "@/backend/services/ongs";
import type { Ong } from "@prisma/client";
import { urlPublica } from "@/lib/armazenamento";
import type { DadosCartaoOng } from "@/components/ong/CartaoOng";

/** Card "Como aparece no mapa" e os itens com a urgência de cada um (O2). */
export async function dadosDoPainel(ong: Ong) {
  const nomes = await nomesDasListas();
  const urgencias = urgenciasAtivas(ong);
  const porItem = new Map(urgencias.map((u) => [u.item, u]));
  const itens = itensDaOng(ong, nomes.ITEM).map((i) => ({ ...i, urgencia: porItem.get(i.item) ?? null }));

  const local = ong.endereco?.bairro || ong.endereco?.municipio;
  const cartao: DadosCartaoOng = {
    nome: ong.nomePublico ?? ong.razaoSocial,
    logoUrl: ong.logo ? urlPublica(ong.logo) : null,
    subtitulo: [ong.causas[0] ? nomes.CAUSA.get(ong.causas[0]) : null, local].filter(Boolean).join(" · "),
    itens: itens.slice(0, 3).map((i) => i.nome),
    urgentes: urgencias.map((u) => u.nome),
  };

  return { cartao, itens, urgencias, pagina: `/ong/${ong.slug ?? ong.id}` };
}

export type ItemDoPainel = Awaited<ReturnType<typeof dadosDoPainel>>["itens"][number];
