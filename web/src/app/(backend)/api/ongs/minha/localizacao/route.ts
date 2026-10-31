import { localizacaoSchema } from "@/backend/schemas";
import { salvarLocalizacao } from "@/backend/services/ongs";
import { rotaDoCadastro } from "../_utils/rotaDoCadastro";

// passo 3 do cadastro: endereço e posição do pin
export const PUT = rotaDoCadastro(localizacaoSchema, salvarLocalizacao);
