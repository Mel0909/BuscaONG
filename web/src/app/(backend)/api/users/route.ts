import { NextRequest, NextResponse } from "next/server";

import { blockForbiddenRequests, zodErrorHandler } from "@/utils/api/server";
import { getAllUsers } from "../../services/users";
import { AllowedRoutes } from "@/types";

const allowedRoles: AllowedRoutes = {
  GET: ["ADMIN"]
}

// rota de get all users
export async function GET(request: NextRequest) {
  try {
    const forbidden = await blockForbiddenRequests(request, allowedRoles.POST);
    if (forbidden) {
      return forbidden;
    }

    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }

    return zodErrorHandler(error);
  }
}
