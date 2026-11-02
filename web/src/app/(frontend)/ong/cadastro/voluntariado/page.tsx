import { listarOpcoes } from "@/backend/services/listas";
import { PassoVoluntariado } from "../_components/PassoVoluntariado";
import { carregarPasso } from "../_utils/carregarPasso";
import { dadosVoluntariado } from "../_utils/dadosDosPassos";

// passo 6 de 8
export default async function CadastroVoluntariadoPage() {
  const { ong } = await carregarPasso(6);
  const atividades = await listarOpcoes("ATIVIDADE");

  return <PassoVoluntariado atividades={atividades} inicial={dadosVoluntariado(ong)} />;
}
