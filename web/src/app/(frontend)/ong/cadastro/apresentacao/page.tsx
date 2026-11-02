import { armazenamentoDisponivel } from "@/lib/armazenamento";
import { PassoApresentacao } from "../_components/PassoApresentacao";
import { carregarPasso } from "../_utils/carregarPasso";
import { dadosApresentacao } from "../_utils/dadosDosPassos";

// passo 7 de 8
export default async function CadastroApresentacaoPage() {
  const { ong } = await carregarPasso(7);
  return <PassoApresentacao envioDisponivel={armazenamentoDisponivel()} inicial={dadosApresentacao(ong)} />;
}
