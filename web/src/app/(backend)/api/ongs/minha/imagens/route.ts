import { envioImagemSchema } from "@/backend/schemas";
import { criarEnvioImagem } from "@/backend/services/ongs";
import { rotaDoCadastro } from "../_utils/rotaDoCadastro";

// passo 7: URL assinada para o navegador enviar a logo ou a capa direto ao R2
export const POST = rotaDoCadastro(envioImagemSchema, criarEnvioImagem, 201);
