import { PassoContatos } from "../../../cadastro/_components/PassoContatos";
import { dadosContatos } from "../../../cadastro/_utils/dadosDosPassos";
import { carregarPainel } from "../../_utils/carregarPainel";

// painel: contatos e redes (mesmo formulário do passo 4)
export default async function PainelContatosPage() {
  const { ong, emailAcesso } = await carregarPainel();
  return <PassoContatos inicial={dadosContatos(ong)} emailAcesso={emailAcesso} />;
}
