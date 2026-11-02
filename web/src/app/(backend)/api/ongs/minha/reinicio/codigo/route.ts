import { solicitarReinicioSchema } from "@/backend/schemas/recuperacao.schema";
import { solicitarCodigoReinicio } from "@/backend/services/ongs/reinicio";
import { rotaReinicio } from "../_utils/rotaReinicio";

export const POST = rotaReinicio(solicitarReinicioSchema, (userId, email, _dados, headers) =>
  solicitarCodigoReinicio(userId, email, headers), true);
