import { Resend } from "resend";

/** Um e-mail do site. O texto puro vai sempre (leitor de tela, cliente sem HTML); o HTML é opcional. */
export type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** Remetente de teste do Resend. Em produção, o build exige EMAIL_FROM (lib/ambiente.ts). */
const REMETENTE_DE_TESTE = "BuscaONG <onboarding@resend.dev>";

let resend: Resend | undefined;

/**
 * Envia pelo Resend (https://resend.com/docs/send-with-nodejs). Se o Resend recusar, lança erro, e
 * quem chama decide: o código de verificação precisa falhar junto; os avisos da equipe só registram.
 * Fora de produção, sem RESEND_API_KEY, escreve o e-mail no terminal em vez de enviar (dá para
 * testar o cadastro e a recuperação de senha sem configurar nada).
 */
export async function sendEmail({ to, subject, text, html }: Email): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY não configurada");
    console.info(`\n[e-mail não enviado: sem RESEND_API_KEY]\npara: ${to}\nassunto: ${subject}\n\n${text}\n`);
    return;
  }

  resend ??= new Resend(chave);
  const { error } = await resend.emails.send({
    // || e não ??: uma variável definida mas vazia também cai no remetente de teste
    from: process.env.EMAIL_FROM || REMETENTE_DE_TESTE,
    to,
    subject,
    text,
    html,
  });
  if (error) throw new Error(`O Resend recusou o e-mail: ${error.message}`);
}
