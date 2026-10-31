import { voluntariadoSchema } from "@/backend/schemas";
import { salvarVoluntariado } from "@/backend/services/ongs";
import { rotaDoCadastro } from "../_utils/rotaDoCadastro";

// passo 6 do cadastro: horários de voluntariado
export const PUT = rotaDoCadastro(voluntariadoSchema, salvarVoluntariado);
