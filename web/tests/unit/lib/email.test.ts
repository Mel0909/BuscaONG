import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function () {
    return { emails: { send: sendMock } };
  }),
}));

import { sendEmail } from "@/lib/email";
import { codigoVerificacaoEmail } from "@/lib/email/templates/codigoVerificacao";

const email = { to: "ong@exemplo.org", subject: "Assunto", text: "Corpo" };

describe("sendEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("em desenvolvimento sem RESEND_API_KEY, escreve no terminal e não chama o Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");

    await sendEmail(email);

    expect(sendMock).not.toHaveBeenCalled();
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining("ong@exemplo.org"));
  });

  it("em produção sem RESEND_API_KEY, lança erro", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");

    await expect(sendEmail(email)).rejects.toThrow("RESEND_API_KEY");
  });

  it("com RESEND_API_KEY, envia pelo Resend com o remetente do EMAIL_FROM", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    vi.stubEnv("EMAIL_FROM", "BuscaONG <oi@buscaong.org.br>");
    sendMock.mockResolvedValue({ data: { id: "1" }, error: null });

    await sendEmail(email);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: "BuscaONG <oi@buscaong.org.br>", to: "ong@exemplo.org" })
    );
  });

  it("lança erro quando o Resend recusa o envio", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_teste");
    sendMock.mockResolvedValue({ data: null, error: { message: "domínio não verificado" } });

    await expect(sendEmail(email)).rejects.toThrow("domínio não verificado");
  });
});

describe("codigoVerificacaoEmail", () => {
  it("põe o código no assunto, no texto e no html", () => {
    const mensagem = codigoVerificacaoEmail("ong@exemplo.org", "481203", "email-verification", 10);

    expect(mensagem.to).toBe("ong@exemplo.org");
    expect(mensagem.subject).toContain("481203");
    expect(mensagem.text).toContain("481203");
    expect(mensagem.text).toContain("10 minutos");
    expect(mensagem.html).toContain("481203");
  });
});
