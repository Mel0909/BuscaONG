import { listarOpcoes } from "@/backend/services/listas";
import { PassoCausasItens } from "../_components/PassoCausasItens";
import { carregarPasso } from "../_utils/carregarPasso";
import { dadosCausasItens } from "../_utils/dadosDosPassos";

// passo 5 de 8
export default async function CadastroCausasItensPage() {
  const { ong } = await carregarPasso(5);
  const [causas, itens] = await Promise.all([listarOpcoes("CAUSA"), listarOpcoes("ITEM")]);

  return <PassoCausasItens causas={causas} itens={itens} inicial={dadosCausasItens(ong)} />;
}
