import { normalizeCnpj } from "@/utils/validations/cnpj";
import { PROVIDERS } from "./providers";
import { CnpjLookupUnavailableError, CnpjNotFoundError, type CnpjData } from "./types";

export * from "./types";

type LookupOptions = {
  fetchImpl?: typeof fetch;
  /** Tempo máximo por API, em ms */
  timeoutMs?: number;
};

/**
 * Consulta o CNPJ na BrasilAPI, com fallback para Minha Receita e OpenCNPJ.
 * - Devolve os dados da primeira API que encontrar o CNPJ.
 * - Lança CnpjNotFoundError se alguma API respondeu "não encontrado" e nenhuma encontrou.
 * - Lança CnpjLookupUnavailableError se todas falharam (erro de rede, 5xx ou tempo esgotado).
 * Não valida o dígito verificador: isso é feito antes, com isValidCnpj.
 */
export async function lookupCnpj(
  value: string,
  { fetchImpl = fetch, timeoutMs = 5000 }: LookupOptions = {}
): Promise<CnpjData> {
  const cnpj = normalizeCnpj(value);
  let notFound = false;

  for (const provider of PROVIDERS) {
    try {
      const response = await fetchImpl(provider.url(cnpj), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });

      // 404: não encontrado; 400: a API considerou o CNPJ inválido. Nos dois casos, tenta a próxima.
      if (response.status === 404 || response.status === 400) {
        notFound = true;
        continue;
      }
      if (!response.ok) continue;

      return provider.parse(await response.json(), cnpj);
    } catch {
      // erro de rede, tempo esgotado ou resposta inválida: tenta a próxima API
    }
  }

  if (notFound) throw new CnpjNotFoundError(cnpj);
  throw new CnpjLookupUnavailableError();
}
