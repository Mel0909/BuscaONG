import { NextRequest, NextResponse } from "next/server";

import { filtroAcoesSchema } from "@/backend/schemas";
import { acoesEmCsv } from "@/backend/services/admin";
import { exigirSessaoAdmin } from "@/utils/api/server";
import { respostaAdmin } from "../_utils/rotaAdmin";

// A3: "Exportar CSV" do registro de ações, com o filtro da tela
// GET /api/admin/acoes?categoria=suspensoes&q=abrigo
export async function GET(request: NextRequest) {
  try {
    const admin = await exigirSessaoAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const { categoria, q } = filtroAcoesSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const csv = await acoesEmCsv(categoria, q);
    const dia = new Date().toISOString().slice(0, 10);

    // BOM para o Excel abrir os acentos certos
    return new NextResponse(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registro-de-acoes-${dia}.csv"`,
      },
    });
  } catch (error) {
    return respostaAdmin(error);
  }
}
