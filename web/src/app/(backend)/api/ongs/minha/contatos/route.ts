import { contatosSchema } from "@/backend/schemas";
import { salvarContatos } from "@/backend/services/ongs";
import { rotaDoCadastro } from "../_utils/rotaDoCadastro";

// passo 4 do cadastro: contatos e redes
export const PUT = rotaDoCadastro(contatosSchema, salvarContatos);
