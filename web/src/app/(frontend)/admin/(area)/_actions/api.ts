// Chamadas às rotas do admin (/api/admin/*), com a mensagem de erro pronta para mostrar.

export type RespostaAdmin<T = unknown> = { ok: true; dados: T } | { ok: false; mensagem: string };

export async function chamarAdmin<T = unknown>(
  metodo: "POST" | "PUT" | "PATCH" | "DELETE",
  caminho: string,
  corpo?: unknown
): Promise<RespostaAdmin<T>> {
  try {
    const resposta = await fetch(`/api/admin/${caminho}`, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const body = await resposta.json().catch(() => null);
    if (resposta.ok) return { ok: true, dados: body as T };
    const mensagem =
      resposta.status === 401 ? "Sua sessão terminou. Entre de novo." : (body?.error?.message ?? "Não foi possível concluir. Tente de novo.");
    return { ok: false, mensagem };
  } catch {
    return { ok: false, mensagem: "Sem conexão. Confira a internet e tente de novo." };
  }
}
