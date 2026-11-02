import { PassoLocalizacao } from "../_components/PassoLocalizacao";
import { carregarPasso } from "../_utils/carregarPasso";
import { dadosLocalizacao } from "../_utils/dadosDosPassos";

// passo 3 de 8
export default async function CadastroLocalizacaoPage() {
  const { ong } = await carregarPasso(3);
  return <PassoLocalizacao {...dadosLocalizacao(ong)} />;
}
