// Normalização dos contatos do passo 4. Cada função devolve null quando o valor não é válido.

/**
 * WhatsApp brasileiro em E.164: "(11) 97123-4567" ou "+55 11 97123-4567" → "+5511971234567".
 * Aceita celular (9 dígitos) e fixo (8 dígitos, para quem usa WhatsApp Business num fixo).
 */
export function normalizarWhatsapp(valor: string): string | null {
  let digitos = valor.replace(/\D/g, "");
  if (digitos.length >= 12 && digitos.startsWith("55")) digitos = digitos.slice(2);
  if (digitos.startsWith("0")) digitos = digitos.slice(1); // 0 de longa distância
  if (!/^[1-9][1-9]\d{8,9}$/.test(digitos)) return null;
  // celular tem 9 dígitos e começa com 9
  if (digitos.length === 11 && digitos[2] !== "9") return null;
  return `+55${digitos}`;
}

/** "+5511971234567" → "+55 (11) 97123-4567" */
export function formatarWhatsapp(e164: string): string {
  const m = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/** Link que abre a conversa: "+5511971234567" → "https://wa.me/5511971234567" */
export function linkWhatsapp(e164: string): string {
  return `https://wa.me/${e164.replace(/\D/g, "")}`;
}

/** "@casalar", "casalar" ou "instagram.com/casalar/" → "@casalar" */
export function normalizarInstagram(valor: string): string | null {
  const texto = valor.trim();
  const doLink = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i.exec(texto);
  const usuario = (doLink ? doLink[1] : texto.replace(/^@/, "")).toLowerCase();
  // regra do Instagram: até 30 caracteres, letras, números, ponto e sublinhado
  if (!/^[a-z0-9._]{1,30}$/.test(usuario)) return null;
  return `@${usuario}`;
}

/** "casalar.org.br" → "https://casalar.org.br" (só http e https) */
export function normalizarSite(valor: string): string | null {
  const texto = valor.trim();
  const comProtocolo = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;
  try {
    const url = new URL(comProtocolo);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
