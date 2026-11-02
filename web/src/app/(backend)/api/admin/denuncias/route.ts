import { arquivarDenunciasSchema } from "@/backend/schemas";
import { arquivarDenuncias } from "@/backend/services/admin";
import { rotaAdmin } from "../_utils/rotaAdmin";

// A2: arquiva as denúncias abertas de uma ONG por um motivo (sem agir sobre a ONG)
export const PATCH = rotaAdmin(arquivarDenunciasSchema, (admin, { ongId, motivo, justificativa }) =>
  arquivarDenuncias(admin, ongId, motivo, justificativa)
);
