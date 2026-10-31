import { publicacaoSchema } from "@/backend/schemas";
import { publicarOng } from "@/backend/services/ongs";
import { rotaDoCadastro } from "../_utils/rotaDoCadastro";

// passo 8: publica o perfil (o service confere se o cadastro está completo)
export const POST = rotaDoCadastro(publicacaoSchema, publicarOng);
