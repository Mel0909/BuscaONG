import { formatarWhatsapp } from "@/utils/validations/contatos";
import { PassoContatos, type ContatosForm } from "../_components/PassoContatos";
import { carregarPasso } from "../_utils/carregarPasso";

const vazio = { valor: "", visivel: true };

// passo 4 de 8
export default async function CadastroContatosPage() {
  const { ong, emailAcesso } = await carregarPasso(4);
  const c = ong.contatos;

  const inicial: ContatosForm = {
    whatsapp: c?.whatsapp ? { ...c.whatsapp, valor: formatarWhatsapp(c.whatsapp.valor) } : vazio,
    email: c?.email ?? vazio,
    site: c?.site ?? vazio,
    instagram: c?.instagram ?? vazio,
  };

  return <PassoContatos inicial={inicial} emailAcesso={emailAcesso} />;
}
