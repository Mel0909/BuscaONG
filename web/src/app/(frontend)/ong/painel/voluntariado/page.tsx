import { listarOpcoes } from "@/backend/services/listas";
import { PassoVoluntariado } from "../../cadastro/_components/PassoVoluntariado";
import { dadosVoluntariado } from "../../cadastro/_utils/dadosDosPassos";
import { TituloPainel } from "../_components/ui";
import { carregarPainel } from "../_utils/carregarPainel";

// painel: horários de voluntariado (mesmo formulário do passo 6)
export default async function PainelVoluntariadoPage() {
  const { ong } = await carregarPainel();
  const atividades = await listarOpcoes("ATIVIDADE");

  return (
    <div className="flex max-w-[1040px] flex-col gap-6">
      <TituloPainel titulo="Voluntariado">
        Quando vocês recebem voluntários e para fazer o quê. Quem filtra o mapa por dia e turno encontra vocês por aqui.
      </TituloPainel>
      <PassoVoluntariado atividades={atividades} inicial={dadosVoluntariado(ong)} />
    </div>
  );
}
