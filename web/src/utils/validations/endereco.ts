export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

/** "04010-100" → "04010100"; null se não tiver 8 dígitos */
export function normalizarCep(valor: string): string | null {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length === 8 ? digitos : null;
}

/** "04010100" → "04010-100" (máscara progressiva, serve para o campo enquanto digita) */
export function formatarCep(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

// retângulo que cobre o Brasil, ilhas oceânicas incluídas; pega coordenadas trocadas ou absurdas
export const LIMITES_BRASIL = { latMin: -34, latMax: 6, lngMin: -74.5, lngMax: -28 } as const;
