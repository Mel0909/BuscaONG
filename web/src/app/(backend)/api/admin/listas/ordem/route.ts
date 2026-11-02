import { ordemListaSchema } from "@/backend/schemas";
import { reordenarLista } from "@/backend/services/admin";
import { rotaAdmin } from "../../_utils/rotaAdmin";

// A4: nova ordem de uma lista (é a ordem dos filtros e do cadastro)
export const PUT = rotaAdmin(ordemListaSchema, (admin, { tipo, ids }) => reordenarLista(admin, tipo, ids));
