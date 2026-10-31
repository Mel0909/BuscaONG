import { armazenamentoDisponivel, urlPublica } from "@/lib/armazenamento";
import { capitalizarNome } from "@/utils/formatters/receita";
import { PassoApresentacao } from "../_components/PassoApresentacao";
import { carregarPasso } from "../_utils/carregarPasso";

const imagem = (chave: string | null) => (chave ? { chave, url: urlPublica(chave) } : null);

// passo 7 de 8
export default async function CadastroApresentacaoPage() {
  const { ong } = await carregarPasso(7);

  return (
    <PassoApresentacao
      envioDisponivel={armazenamentoDisponivel()}
      inicial={{
        // primeira visita: sugere a razão social, que a ONG pode trocar
        nomePublico: ong.nomePublico ?? capitalizarNome(ong.razaoSocial),
        descricaoCurta: ong.descricaoCurta ?? "",
        sobre: ong.sobre ?? "",
        logo: imagem(ong.logo),
        capa: imagem(ong.capa),
      }}
    />
  );
}
