import { causasItensSchema } from "@/backend/schemas";
import { salvarCausasItens } from "@/backend/services/ongs";
import { rotaDoCadastro } from "../_utils/rotaDoCadastro";

// passo 5 do cadastro: causas e itens
export const PUT = rotaDoCadastro(causasItensSchema, salvarCausasItens);
