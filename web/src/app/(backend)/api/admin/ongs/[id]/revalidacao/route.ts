import { z } from "zod";
import { revalidarCnpj } from "@/backend/services/admin";
import { rotaAdmin } from "../../../_utils/rotaAdmin";

// A1: consulta o CNPJ de novo na Receita (situação, natureza e endereço)
export const POST = rotaAdmin(z.object({}).strict(), (admin, _, { id }) => revalidarCnpj(admin, id));
