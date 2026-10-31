// Chamadas à API dos passos 3 a 8 (PUT/POST /api/ongs/minha/<seção>).

export type RespostaPasso<T = unknown> =
  | { ok: true; dados: T }
  | {
      ok: false;
      status: number;
      mensagem: string;
      /** erro por campo, com o caminho que o Zod devolve (ex.: "whatsapp.valor") */
      campos: Record<string, string>;
      details: unknown;
    };

export async function enviarPasso<T = unknown>(
  secao: string,
  corpo: unknown,
  metodo: "PUT" | "POST" = "PUT"
): Promise<RespostaPasso<T>> {
  try {
    const response = await fetch(`/api/ongs/minha/${secao}`, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const body = await response.json().catch(() => null);

    if (response.ok) return { ok: true, dados: body as T };

    const details = body?.error?.details;
    const campos: Record<string, string> = {};
    if (Array.isArray(details)) {
      for (const d of details) if (d?.campo && !campos[d.campo]) campos[d.campo] = d.message;
    }

    const mensagem =
      response.status === 401
        ? "Sua sessão terminou. Entre de novo para continuar o cadastro."
        : body?.error?.message ?? "Não foi possível salvar. Tente de novo.";

    return { ok: false, status: response.status, mensagem, campos, details };
  } catch {
    return {
      ok: false,
      status: 0,
      mensagem: "Sem conexão. Confira a internet e tente de novo.",
      campos: {},
      details: null,
    };
  }
}
