import { carregarPasso } from "../_utils/carregarPasso";
import { ReiniciarCadastro } from "../_components/ReiniciarCadastro";

export default async function ReiniciarPage() {
  const { emailAcesso } = await carregarPasso(3);
  return <ReiniciarCadastro email={emailAcesso} />;
}
