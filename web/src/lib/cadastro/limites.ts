// Limites do cadastro da ONG, usados pelos schemas da API e pelas telas.
// Ficam fora dos schemas para as telas não importarem código de servidor.

export const MAX_CAUSAS = 3;
export const MAX_ITENS_LIVRES = 20;
export const MAX_HORARIOS = 20;
export const MAX_DESCRICAO_CURTA = 160;

export const TIPOS_IMAGEM = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type TipoImagem = keyof typeof TIPOS_IMAGEM;

export const TAMANHO_MAXIMO_IMAGEM = { logo: 2 * 1024 * 1024, capa: 5 * 1024 * 1024 } as const;
export const LADO_MINIMO_LOGO = 400; // px
