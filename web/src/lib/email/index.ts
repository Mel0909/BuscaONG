import { Resend } from "resend";

export type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let client: Resend | null = null;

/**
 * Envia um e-mail pelo Resend (RESEND_API_KEY e EMAIL_FROM no .env).
 * Em desenvolvimento, sem RESEND_API_KEY, só escreve o e-mail no terminal,
 * para dar para testar fluxos como o código de verificação sem configurar nada.
 */
export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY não configurada");
    }
    console.info(`\n[email] para: ${email.to}\n[email] assunto: ${email.subject}\n${email.text}\n`);
    return;
  }

  client ??= new Resend(apiKey);
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM ?? "BuscaONG <onboarding@resend.dev>",
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });

  if (error) {
    throw new Error(`Falha ao enviar e-mail: ${error.message}`);
  }
}
