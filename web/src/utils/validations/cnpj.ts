// CNPJ numérico e alfanumérico (Receita Federal, a partir de jul/2026).
// Formato: 12 caracteres [0-9A-Z] (raiz + ordem) + 2 dígitos verificadores [0-9].
// Os dígitos verificadores usam módulo 11; cada caractere vale o código ASCII - 48
// (Nota Técnica Conjunta 2025.001). Para CNPJs só numéricos, o resultado é o mesmo de antes.

export const CNPJ_LENGTH = 14;

const FIRST_DIGIT_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_DIGIT_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Remove máscara e espaços e passa para maiúsculas. Mantém só [0-9A-Z]. */
export function normalizeCnpj(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

function checkDigit(base: string, weights: number[]): number {
  const sum = [...base].reduce(
    (acc, char, i) => acc + (char.charCodeAt(0) - 48) * weights[i],
    0
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Valida formato e dígitos verificadores. Aceita o valor com ou sem máscara. */
export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeCnpj(value);

  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(cnpj)) return false;
  // sequências repetidas (00000000000000, 11111111111111...) passam na conta, mas não existem
  if (/^(.)\1+$/.test(cnpj)) return false;

  const base = cnpj.slice(0, 12);
  const first = checkDigit(base, FIRST_DIGIT_WEIGHTS);
  const second = checkDigit(base + first, SECOND_DIGIT_WEIGHTS);

  return cnpj.slice(12) === `${first}${second}`;
}

/**
 * Aplica a máscara XX.XXX.XXX/XXXX-XX progressivamente, para usar no campo enquanto se digita.
 * Os 2 últimos caracteres só aceitam números.
 */
export function formatCnpj(value: string): string {
  const raw = normalizeCnpj(value);
  const base = raw.slice(0, 12);
  const digits = raw.slice(12).replace(/\D/g, "").slice(0, 2);
  const cnpj = base.length < 12 ? base : base + digits;

  const parts = [
    cnpj.slice(0, 2),
    cnpj.slice(2, 5),
    cnpj.slice(5, 8),
    cnpj.slice(8, 12),
    cnpj.slice(12, 14),
  ];

  let formatted = parts[0];
  if (parts[1]) formatted += `.${parts[1]}`;
  if (parts[2]) formatted += `.${parts[2]}`;
  if (parts[3]) formatted += `/${parts[3]}`;
  if (parts[4]) formatted += `-${parts[4]}`;
  return formatted;
}
