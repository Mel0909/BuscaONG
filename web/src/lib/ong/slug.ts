import { normalizarChave } from "@/utils/formatters/texto";

// Endereço da página pública da ONG: /ong/<slug> (protótipo: buscaong.org/ong/casa-lar-esperanca).

/** Rotas fixas dentro de /ong que um slug não pode ocupar. */
export const SLUGS_RESERVADOS = new Set(["cadastro", "painel", "entrar", "login", "admin", "nova", "minha"]);

const TAMANHO_MAXIMO = 60;

/** "Casa Lar Esperança!" → "casa-lar-esperanca" */
export function slugDoNome(nome: string): string {
  const slug = normalizarChave(nome)
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TAMANHO_MAXIMO)
    .replace(/-+$/, "");
  return slug || "ong";
}

/**
 * Primeiro slug livre a partir do nome: "casa-lar", "casa-lar-2", "casa-lar-3"...
 * `ocupado` diz se um slug já é de outra ONG.
 */
export async function slugLivre(nome: string, ocupado: (slug: string) => Promise<boolean>): Promise<string> {
  const base = slugDoNome(nome);
  for (let n = 1; ; n++) {
    const candidato = n === 1 ? base : `${base}-${n}`;
    // um slug igual ao ID de outra ONG tomaria o link antigo /ong/<id> dela
    if (SLUGS_RESERVADOS.has(candidato) || ehObjectId(candidato)) continue;
    if (!(await ocupado(candidato))) return candidato;
  }
}

/** ID do MongoDB (ObjectId): 24 caracteres hexadecimais. */
export const ehObjectId = (valor: string) => /^[a-f0-9]{24}$/.test(valor);
