import type { Email } from "..";

export type TipoCodigo = "sign-in" | "email-verification" | "forget-password" | "change-email";

const ASSUNTOS: Record<TipoCodigo, string> = {
  "email-verification": "Seu código para confirmar o e-mail",
  "sign-in": "Seu código para entrar",
  "forget-password": "Seu código para redefinir a senha",
  "change-email": "Seu código para trocar o e-mail",
};

/** E-mail com o código de 6 dígitos (cadastro da ONG, login, redefinir senha...). */
export function codigoVerificacaoEmail(
  to: string,
  codigo: string,
  tipo: TipoCodigo,
  validadeMinutos: number
): Email {
  const assunto = ASSUNTOS[tipo];

  const text = [
    `${assunto}: ${codigo}`,
    "",
    `O código vale por ${validadeMinutos} minutos.`,
    "Se você não pediu este código, pode ignorar este e-mail.",
    "",
    "BuscaONG",
  ].join("\n");

  // cores do BuscaONG (docs/buscaong.md §11); e-mail precisa de estilo inline
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:32px 16px;background:#F6F3EA;font-family:Arial,sans-serif;color:#1F2B24">
    <div style="max-width:480px;margin:0 auto;background:#FFFDF8;border:1px solid #DCD5C4;border-radius:16px;padding:32px">
      <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#2E5E45">BuscaONG</p>
      <p style="margin:0 0 16px;font-size:16px">${assunto}:</p>
      <p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:8px;color:#1F4232">${codigo}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#5E6B62">O código vale por ${validadeMinutos} minutos.</p>
      <p style="margin:0;font-size:14px;color:#5E6B62">Se você não pediu este código, pode ignorar este e-mail.</p>
    </div>
  </body>
</html>`;

  return { to, subject: `${codigo} é ${assunto.toLowerCase()} · BuscaONG`, text, html };
}
