import { PassoLocalizacao } from "../../../cadastro/_components/PassoLocalizacao";
import { dadosLocalizacao } from "../../../cadastro/_utils/dadosDosPassos";
import { carregarPainel } from "../../_utils/carregarPainel";

// painel: endereço e pin no mapa (mesmo formulário do passo 3)
export default async function PainelLocalizacaoPage() {
  const { ong } = await carregarPainel();
  return <PassoLocalizacao {...dadosLocalizacao(ong)} />;
}
