import { decisaoItemLivreSchema } from "@/backend/schemas";
import { decidirItemLivre } from "@/backend/services/admin";
import { rotaAdmin } from "../_utils/rotaAdmin";

// A4: item escrito à mão pelas ONGs vira item da lista, é unificado com um item da lista
// (as ONGs passam a usá-lo) ou fica como texto livre (sai das sugestões)
export const POST = rotaAdmin(decisaoItemLivreSchema, (admin, decisao) => decidirItemLivre(admin, decisao));
