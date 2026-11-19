import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { revalidarCnpjsAntigos } from "@/backend/services/admin";
import { zodErrorHandler } from "@/utils/api/server";
import { toErrorMessage } from "@/utils/api/toErrorMessage";

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
    return NextResponse.json(toErrorMessage("Revalidação automática não configurada"), { status: 503 });
  }
  if (!mesmoSegredo(request.headers.get("authorization") ?? "", `Bearer ${segredo}`)) {
    return NextResponse.json(toErrorMessage("Não autorizado"), { status: 401 });
  }

  try {
    return NextResponse.json(await revalidarCnpjsAntigos());
  } catch (error) {
    return zodErrorHandler(error);
  }
}
