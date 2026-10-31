/** "  Fraldas  Tamanho G " → "fraldas tamanho g": minúsculas, sem acento e sem espaço duplicado. */
export function normalizarChave(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Iniciais para o avatar sem logo: "Casa Lar Esperança" → "CE" (primeira e última palavra). */
export function iniciais(nome: string): string {
  const palavras = nome.split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÀ-Ý]/.test(p));
  if (palavras.length === 0) return nome.slice(0, 2).toUpperCase();
  const primeira = palavras[0];
  const ultima = palavras.length > 1 ? palavras[palavras.length - 1] : "";
  return (primeira.charAt(0) + (ultima.charAt(0) || primeira.charAt(1))).toUpperCase();
}
