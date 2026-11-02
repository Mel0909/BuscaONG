import { exclusaoOngSchema, statusOngAdminSchema } from "@/backend/schemas";
import { alterarStatusOng, excluirOng } from "@/backend/services/admin";
import { rotaAdmin } from "../../_utils/rotaAdmin";

// A1/A2: suspende (sai do mapa) ou reativa a ONG, com motivo
export const PATCH = rotaAdmin(statusOngAdminSchema, (admin, { status, motivo }, { id }) =>
  alterarStatusOng(admin, id, status, motivo)
);

// A1: exclui a ONG e a conta dela, com motivo
export const DELETE = rotaAdmin(exclusaoOngSchema, (admin, { motivo }, { id }) => excluirOng(admin, id, motivo));
