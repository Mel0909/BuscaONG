import { confirmarReinicioSchema } from "@/backend/schemas/recuperacao.schema";
import { reiniciarCadastro } from "@/backend/services/ongs/reinicio";
import { rotaReinicio } from "./_utils/rotaReinicio";

export const POST = rotaReinicio(confirmarReinicioSchema, (userId, email, dados, headers) =>
  reiniciarCadastro(userId, email, dados.codigo, headers));
