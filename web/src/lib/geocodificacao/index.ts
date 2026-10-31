// Endereço → coordenadas aproximadas, pelo Nominatim (OpenStreetMap).
// O Nominatim permite guardar o resultado (dados ODbL, com atribuição "© OpenStreetMap").
// A geocodificação comum do Mapbox não permite, por isso ela não é usada aqui.
//
// Política de uso (operations.osmfoundation.org/policies/nominatim): User-Agent que identifique
// o app, no máximo 1 consulta por segundo, cache das respostas e nada de autocompletar.

const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "perto (cadastro de ONGs; BuscaONG)";
const INTERVALO_MS = 1100;
const CACHE_MAX = 500;

export type EnderecoParaGeocodificar = {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  municipio: string;
  uf: string;
  cep?: string | null;
};

export type ResultadoGeocodificacao = {
  latitude: number;
  longitude: number;
  /** "endereco" quando achou a rua; "cidade" quando só achou o município */
  precisao: "endereco" | "cidade";
};

type Opcoes = { fetchImpl?: typeof fetch; timeoutMs?: number };

const cache = new Map<string, ResultadoGeocodificacao | null>();
let fila: Promise<unknown> = Promise.resolve();
let ultimaChamada = 0;

/** Só para testes. */
export function limparCacheGeocodificacao() {
  cache.clear();
  ultimaChamada = 0;
}

// garante o intervalo mínimo entre chamadas, mesmo com várias requisições ao mesmo tempo
function naFila<T>(tarefa: () => Promise<T>): Promise<T> {
  const proxima = fila.then(async () => {
    const espera = ultimaChamada + INTERVALO_MS - Date.now();
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    ultimaChamada = Date.now();
    return tarefa();
  });
  fila = proxima.catch(() => {});
  return proxima;
}

async function consultar(params: Record<string, string>, { fetchImpl = fetch, timeoutMs = 5000 }: Opcoes) {
  const url = new URL(URL_NOMINATIM);
  for (const [k, v] of Object.entries({ ...params, countrycodes: "br", format: "jsonv2", limit: "1" })) {
    url.searchParams.set(k, v);
  }

  const response = await naFila(() =>
    fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR" },
      signal: AbortSignal.timeout(timeoutMs),
    })
  );
  if (!response.ok) throw new Error(`Nominatim respondeu ${response.status}`);

  const lista = (await response.json()) as { lat: string; lon: string }[];
  if (!Array.isArray(lista) || lista.length === 0) return null;
  const latitude = Number(lista[0].lat);
  const longitude = Number(lista[0].lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

/**
 * Tenta a rua com número; se não achar, cai para o município (o pin fica no centro da cidade
 * e a ONG ajusta). Devolve null se nem o município for encontrado.
 * Erros de rede sobem para quem chamou.
 */
export async function geocodificar(
  endereco: EnderecoParaGeocodificar,
  opcoes: Opcoes = {}
): Promise<ResultadoGeocodificacao | null> {
  const chave = JSON.stringify(endereco);
  if (cache.has(chave)) return cache.get(chave)!;

  const cidade = { city: endereco.municipio, state: endereco.uf, country: "Brasil" };
  let resultado: ResultadoGeocodificacao | null = null;

  if (endereco.logradouro) {
    const rua = [endereco.numero, endereco.logradouro].filter(Boolean).join(" ");
    const ponto = await consultar({ street: rua, ...cidade }, opcoes);
    if (ponto) resultado = { ...ponto, precisao: "endereco" };
  }

  if (!resultado) {
    const ponto = await consultar(cidade, opcoes);
    if (ponto) resultado = { ...ponto, precisao: "cidade" };
  }

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(chave, resultado);
  return resultado;
}
