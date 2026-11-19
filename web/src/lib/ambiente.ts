// Variáveis de ambiente que o site precisa em produção. O next.config.ts chama
// verificarAmbienteDeProducao no build de produção da Vercel: sem uma variável essencial, o build
// falha com a lista do que falta, em vez de o site subir e só quebrar no primeiro login ou e-mail.
// (Na Vercel, um build que falha não substitui o deploy que está no ar.)
// Nunca imprime valores, só nomes.

type Ambiente = Record<string, string | undefined>;

/** Sem elas o site não funciona: banco, sessões e e-mails (cadastro e recuperação de senha). */
const ESSENCIAIS = {
  DATABASE_URL: "conexão com o MongoDB",
  BETTER_AUTH_SECRET: "assina as sessões; gere com openssl rand -base64 32",
  BETTER_AUTH_URL: "endereço público do site, como https://buscaong.org",
  RESEND_API_KEY: "envio dos códigos por e-mail",
  EMAIL_FROM: "remetente dos e-mails, de um domínio verificado no Resend",
} as const;

/** Sem elas uma parte do site fica desligada, mas o resto funciona. */
const OPCIONAIS = {
  NEXT_PUBLIC_MAPBOX_TOKEN: "sem ela, o mapa aparece como indisponível",
  CRON_SECRET: "sem ela, a revalidação diária do CNPJ não roda",
  R2_ACCOUNT_ID: "sem as variáveis R2_*, o envio de logo e capa fica desligado",
} as const;

/** O better-auth recomenda pelo menos 32 caracteres. */
const TAMANHO_MINIMO_SEGREDO = 32;

const vazia = (valor: string | undefined) => !valor || valor.trim() === "";

export function verificarAmbienteDeProducao(ambiente: Ambiente) {
  const erros = Object.entries(ESSENCIAIS)
    .filter(([nome]) => vazia(ambiente[nome]))
    .map(([nome, motivo]) => `${nome} não definida (${motivo})`);

  const avisos = Object.entries(OPCIONAIS)
    .filter(([nome]) => vazia(ambiente[nome]))
    .map(([nome, efeito]) => `${nome} não definida: ${efeito}`);

  const segredo = ambiente.BETTER_AUTH_SECRET;
  if (!vazia(segredo) && segredo!.length < TAMANHO_MINIMO_SEGREDO) {
    avisos.push(`BETTER_AUTH_SECRET tem menos de ${TAMANHO_MINIMO_SEGREDO} caracteres; gere outro com: openssl rand -base64 32`);
  }
  const url = ambiente.BETTER_AUTH_URL;
  if (!vazia(url) && !url!.startsWith("https://")) {
    erros.push("BETTER_AUTH_URL precisa começar com https:// em produção");
  }

  return { erros, avisos };
}
