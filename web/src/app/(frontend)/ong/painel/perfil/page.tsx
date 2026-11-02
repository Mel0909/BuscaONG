import { armazenamentoDisponivel } from "@/lib/armazenamento";
import { PassoApresentacao } from "../../cadastro/_components/PassoApresentacao";
import { dadosApresentacao } from "../../cadastro/_utils/dadosDosPassos";
import { carregarPainel } from "../_utils/carregarPainel";

// painel: nome público, descrição, logo e capa (mesmo formulário do passo 7)
export default async function PainelApresentacaoPage() {
  const { ong } = await carregarPainel();
  return <PassoApresentacao envioDisponivel={armazenamentoDisponivel()} inicial={dadosApresentacao(ong)} />;
}
