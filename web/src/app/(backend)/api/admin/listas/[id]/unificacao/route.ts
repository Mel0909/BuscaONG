import { unificacaoOpcaoSchema } from "@/backend/schemas";
import { unificarOpcoes } from "@/backend/services/admin";
import { rotaAdmin } from "../../../_utils/rotaAdmin";

// A4: passa as ONGs desta opção para outra da mesma lista e apaga esta
export const POST = rotaAdmin(unificacaoOpcaoSchema, (admin, { destinoId }, { id }) => unificarOpcoes(admin, id, destinoId));
