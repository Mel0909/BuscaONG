import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { revalidarCnpjsAntigos } from "@/backend/services/admin";
import { erroJson, erroNaRota } from "@/utils/api/server";

// rotina diária da Vercel (web/vercel.json); não pode vir de cache
export const dynamic = "force-dynamic";
// 10 consultas com pausa de ~1 s, cada uma com até 5 s por API
export const maxDuration = 60;

/** Compara sem vazar pelo tempo de resposta quantos caracteres batem. */
function mesmoSegredo(recebido: string, esperado: string) {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * 6.1: revalida o CNPJ das ONGs consultadas há mais tempo. Só a Vercel chama: ela manda o
 * CRON_SECRET no header Authorization ("Bearer <segredo>"). Sem o segredo configurado, recusa tudo.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) {
    return erroJson(503, "Revalidação automática não configurada");
  }
  if (!mesmoSegredo(request.headers.get("authorization") ?? "", `Bearer ${segredo}`)) {
    return erroJson(401, "Não autorizado");
  }

  try {
    return NextResponse.json(await revalidarCnpjsAntigos());
  } catch (error) {
    return erroNaRota(error);
  }
}
