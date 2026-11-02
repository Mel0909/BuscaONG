import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { idSchema, patchSchema } from "@/backend/schemas";
import { deleteUser, findUserById, updateUser } from "@/backend/services/users";
import { returnInvalidDataErrors, zodErrorHandler } from "@/utils/api/server";
import { toErrorMessage } from "@/utils/api/toErrorMessage";

type Contexto = { params: Promise<{ id: string }> };

/** Autoriza antes de consultar ou alterar a conta indicada pela URL. */
async function autorizarConta(request: NextRequest, { params }: Contexto) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json(toErrorMessage("Faça login para continuar"), { status: 401 });
  }
  if (session.role !== "ADMIN" && session.role !== "ONG") {
    return NextResponse.json(toErrorMessage("Acesso negado"), { status: 403 });
  }

  const resultado = idSchema.safeParse((await params).id);
  if (!resultado.success) {
    return NextResponse.json(toErrorMessage("ID inválido"), { status: 400 });
  }
  if (session.role !== "ADMIN" && session.user.id !== resultado.data) {
    return NextResponse.json(toErrorMessage("Acesso negado"), { status: 403 });
  }
  return resultado.data;
}

export async function GET(request: NextRequest, contexto: Contexto) {
  try {
    const id = await autorizarConta(request, contexto);
    if (id instanceof NextResponse) return id;

    const usuario = await findUserById(id);
    if (!usuario) {
      return NextResponse.json(toErrorMessage("Usuário não encontrado"), { status: 404 });
    }
    return NextResponse.json(usuario);
  } catch (error) {
    return zodErrorHandler(error);
  }
}

export async function PATCH(request: NextRequest, contexto: Contexto) {
  try {
    const id = await autorizarConta(request, contexto);
    if (id instanceof NextResponse) return id;

    let corpo: unknown;
    try {
      corpo = await request.json();
    } catch {
      return NextResponse.json(toErrorMessage("JSON malformado"), { status: 400 });
    }
    const resultado = patchSchema.safeParse(corpo);
    if (!resultado.success) return returnInvalidDataErrors(resultado.error);

    const usuario = await updateUser(id, resultado.data);
    return NextResponse.json(usuario);
  } catch (error) {
    return zodErrorHandler(error);
  }
}

export async function DELETE(request: NextRequest, contexto: Contexto) {
  try {
    const id = await autorizarConta(request, contexto);
    if (id instanceof NextResponse) return id;

    const usuario = await deleteUser(id);
    return NextResponse.json(usuario);
  } catch (error) {
    return zodErrorHandler(error);
  }
}
