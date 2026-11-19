import { revisaoImagemSchema } from "@/backend/schemas";
import { revisarImagem } from "@/backend/services/admin";
import { rotaAdmin } from "../_utils/rotaAdmin";

// A5: "ok" ou remover a logo ou a capa nova de uma ONG (remover exige motivo e avisa a ONG)
export const PATCH = rotaAdmin(revisaoImagemSchema, (admin, dados) => revisarImagem(admin, dados));
