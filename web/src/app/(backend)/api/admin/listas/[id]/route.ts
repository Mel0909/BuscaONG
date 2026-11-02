import { z } from "zod";
import { edicaoOpcaoSchema } from "@/backend/schemas";
import { editarOpcao, excluirOpcao } from "@/backend/services/admin";
import { rotaAdmin } from "../../_utils/rotaAdmin";

// A4: renomear, mudar o grupo, ativar ou desativar (o slug guardado nas ONGs não muda)
export const PATCH = rotaAdmin(edicaoOpcaoSchema, (admin, dados, { id }) => editarOpcao(admin, id, dados));

// A4: exclui uma opção que nenhuma ONG usa (em uso: 409, unificar em vez de excluir)
export const DELETE = rotaAdmin(z.object({}).strict(), (admin, _, { id }) => excluirOpcao(admin, id));
