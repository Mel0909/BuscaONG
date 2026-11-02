import { novaOpcaoSchema } from "@/backend/schemas";
import { criarOpcao } from "@/backend/services/admin";
import { rotaAdmin } from "../_utils/rotaAdmin";

// A4: nova opção numa lista fixa (causa, item ou atividade)
export const POST = rotaAdmin(novaOpcaoSchema, (admin, dados) => criarOpcao(admin, dados), 201);
