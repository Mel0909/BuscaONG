import { apresentacaoSchema } from "@/backend/schemas";
import { salvarApresentacao } from "@/backend/services/ongs";
import { rotaDoCadastro } from "../_utils/rotaDoCadastro";

// passo 7 do cadastro: nome, descrição, logo e capa
export const PUT = rotaDoCadastro(apresentacaoSchema, salvarApresentacao);
