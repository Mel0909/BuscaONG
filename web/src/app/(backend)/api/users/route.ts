import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getAllUsers } from "@/backend/services/users";
import { toErrorMessage } from "@/utils/api/toErrorMessage";
import { zodErrorHandler } from "@/utils/api/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(toErrorMessage("Faça login para continuar"), { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json(toErrorMessage("Acesso negado"), { status: 403 });
    }

    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    return zodErrorHandler(error);
  }
}
