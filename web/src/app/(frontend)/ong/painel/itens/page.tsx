import { listarOpcoes } from "@/backend/services/listas";
import { CartaoOng } from "@/components/ong/CartaoOng";
import { PassoCausasItens } from "../../cadastro/_components/PassoCausasItens";
import { dadosCausasItens } from "../../cadastro/_utils/dadosDosPassos";
import { TituloPainel, TituloSecao } from "../_components/ui";
import { carregarPainel } from "../_utils/carregarPainel";
import { dadosDoPainel } from "../_utils/dadosDoPainel";
import { TabelaUrgencias } from "./_components/TabelaUrgencias";

// painel (O2/O3): itens da ONG, com a urgência de cada um, e a lista de causas e itens
export default async function PainelItensPage() {
  const { ong } = await carregarPainel();
  const [{ cartao, itens }, causas, itensDaLista] = await Promise.all([
    dadosDoPainel(ong),
    listarOpcoes("CAUSA"),
    listarOpcoes("ITEM"),
  ]);

  return (
    <div className="flex max-w-[1040px] flex-col gap-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <TituloPainel titulo="Itens e urgência">
            Marque como urgente o que está faltando agora. Sem envio de mensagens: o selo aparece no mapa e na página da
            ONG até o prazo acabar.
          </TituloPainel>
          <TabelaUrgencias
            itens={itens.map((i) => ({
              item: i.item,
              nome: i.nome,
              livre: i.livre,
              urgencia: i.urgencia ? { detalhe: i.urgencia.detalhe, ate: i.urgencia.ate } : null,
            }))}
            ong={{ nome: cartao.nome, logoUrl: cartao.logoUrl }}
            bloqueado={ong.status === "SUSPENSA"}
          />
        </div>
        <section className="flex flex-col gap-3 lg:pt-[100px]">
          <TituloSecao>Como aparece no mapa</TituloSecao>
          <CartaoOng {...cartao} />
        </section>
      </div>

      <section id="editar-itens" className="flex scroll-mt-6 flex-col gap-5 border-t border-borda-suave pt-8">
        <TituloPainel titulo="Causas e itens">
          Os itens que a ONG costuma precisar. Quem filtra o mapa por item encontra vocês por esta lista.
        </TituloPainel>
        <PassoCausasItens causas={causas} itens={itensDaLista} inicial={dadosCausasItens(ong)} />
      </section>
    </div>
  );
}
