import { listarOpcoes } from "@/backend/services/listas";
import { PassoCausasItens } from "../_components/PassoCausasItens";
import { carregarPasso } from "../_utils/carregarPasso";

// passo 5 de 8
export default async function CadastroCausasItensPage() {
  const { ong } = await carregarPasso(5);
  const [causas, itens] = await Promise.all([listarOpcoes("CAUSA"), listarOpcoes("ITEM")]);

  return (
    <PassoCausasItens
      causas={causas}
      itens={itens}
      inicial={{ causas: ong.causas, itens: ong.itens, itensLivres: ong.itensLivres.map((i) => i.nome) }}
    />
  );
}
