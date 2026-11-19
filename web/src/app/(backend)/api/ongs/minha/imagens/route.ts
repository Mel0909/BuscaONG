import { envioImagemSchema } from "@/backend/schemas";
import { criarEnvioImagem } from "@/backend/services/ongs";
import { rotaDoCadastro } from "../_utils/rotaDoCadastro";

// passo 7: URL assinada para o navegador enviar a logo ou a capa direto ao R2.
// Cada URL permite um arquivo novo no bucket (os antigos não são apagados): o limite por conta
// impede encher o armazenamento pedindo URLs sem parar.
export const POST = rotaDoCadastro(envioImagemSchema, criarEnvioImagem, 201, {
  nome: "imagens",
  limit: 20,
  windowMs: 60 * 60_000,
});
