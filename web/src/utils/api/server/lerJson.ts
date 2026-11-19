/** O corpo da requisição não é um JSON válido. `erroNaRota` o transforma em 400. */
export class JsonInvalidoError extends Error {
  constructor() {
    super("JSON malformado");
    this.name = "JsonInvalidoError";
  }
}

/**
 * Lê o corpo da requisição como JSON. Com JSON malformado, lança `JsonInvalidoError`.
 * Com `vazio`, um corpo vazio vale esse valor (ex.: `{}` num POST sem dados); sem ele, também é erro.
 */
export async function lerJson(request: Request, { vazio }: { vazio?: unknown } = {}): Promise<unknown> {
  const texto = await request.text();
  if (texto.trim() === "" && vazio !== undefined) return vazio;
  try {
    return JSON.parse(texto);
  } catch {
    throw new JsonInvalidoError();
  }
}
