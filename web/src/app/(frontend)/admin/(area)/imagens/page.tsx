import { imagensParaRevisar } from "@/backend/services/admin";
import { quandoFoi } from "../_components/ui";
import { carregarAdmin } from "../_utils/carregarAdmin";
import { CartaoImagem } from "./_components/CartaoImagem";

// A5: revisão das imagens novas. A logo e a capa aparecem no perfil na hora; aqui a equipe olha
// as novas e dá "ok" ou remove (com motivo, avisando a ONG).
export default async function AdminImagensPage() {
  await carregarAdmin();
  const imagens = await imagensParaRevisar();
  const agora = new Date();

  return (
    <div className="flex flex-col gap-4 px-4 py-5 md:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-lg font-bold">Imagens novas</h1>
        <p className="max-w-[640px] text-[13px] leading-normal text-cinza-texto">
          A logo e a capa aparecem no perfil assim que a ONG envia. Confira as novas: &ldquo;Ok&rdquo; tira da lista; &ldquo;Remover&rdquo;
          tira a imagem do perfil, apaga o arquivo e avisa a ONG por e-mail com o motivo.
        </p>
      </div>

      {imagens.length === 0 ? (
        <p className="rounded-xl border border-cinza-borda bg-branco px-4 py-6 text-sm text-cinza-texto">Nenhuma imagem para revisar.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {imagens.map((imagem) => (
            <li key={`${imagem.ongId}:${imagem.tipo}`}>
              <CartaoImagem
                ongId={imagem.ongId}
                ong={imagem.ong}
                pagina={imagem.pagina}
                tipo={imagem.tipo}
                chave={imagem.chave}
                url={imagem.url}
                quando={quandoFoi(imagem.atualizadaEm, agora)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
