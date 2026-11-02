import { PassoContatos } from "../_components/PassoContatos";
import { carregarPasso } from "../_utils/carregarPasso";
import { dadosContatos } from "../_utils/dadosDosPassos";

// passo 4 de 8
export default async function CadastroContatosPage() {
  const { ong, emailAcesso } = await carregarPasso(4);
  return <PassoContatos inicial={dadosContatos(ong)} emailAcesso={emailAcesso} />;
}
