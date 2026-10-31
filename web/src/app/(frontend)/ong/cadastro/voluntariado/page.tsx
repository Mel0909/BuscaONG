import { listarOpcoes } from "@/backend/services/listas";
import { PassoVoluntariado } from "../_components/PassoVoluntariado";
import { carregarPasso } from "../_utils/carregarPasso";

// passo 6 de 8
export default async function CadastroVoluntariadoPage() {
  const { ong } = await carregarPasso(6);
  const atividades = await listarOpcoes("ATIVIDADE");

  return (
    <PassoVoluntariado
      atividades={atividades}
      inicial={{
        aceitaVoluntarios: ong.aceitaVoluntarios,
        horarios: ong.horariosVoluntariado.map((h) => ({
          dia: h.dia,
          inicio: h.inicio,
          fim: h.fim,
          atividade: h.atividade,
          atividadeOutra: h.atividadeOutra ?? "",
        })),
        requisitos: ong.requisitosVoluntariado ?? "",
      }}
    />
  );
}
