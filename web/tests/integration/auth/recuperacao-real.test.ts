import { beforeEach, describe, expect, it, vi } from "vitest";
import { betterAuth, type BetterAuthOptions, type DBAdapter } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { auth as configuracao } from "@/auth";
import { sendEmail } from "@/lib/email";
import { resetRateLimit } from "@/utils/api/server/rateLimit";

// Exercita os endpoints reais e a configuração do app, isolando apenas banco e envio.
vi.unmock("@/auth");
vi.mock("@/backend/services/db", () => ({ default: {} }));
vi.mock("@/backend/services/auth", () => ({ getUserRole: async () => "ONG" }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

const email = "ong@example.com";
const storage: Record<string, Record<string, unknown>[]> = {};
function criarAuth() {
  const memoria = memoryAdapter(storage);
  return betterAuth({ ...configuracao.options, database: (options: BetterAuthOptions) => {
    const adapter = memoria(options);
    return { ...adapter, async updateMany(args: Parameters<DBAdapter["updateMany"]>[0]) {
      // O memory-adapter 1.5.5 devolve registro/null, mas Prisma e o contrato devolvem count.
      const resultado = await adapter.updateMany(args);
      return typeof resultado === "number" ? resultado : resultado ? 1 : 0;
    } };
  },
    baseURL: "http://localhost:3000", secret: "segredo-apenas-para-testes-com-mais-de-32-caracteres",
  });
}
let real: ReturnType<typeof criarAuth>;
function ultimoCodigo() {
  const ultimo = vi.mocked(sendEmail).mock.calls.at(-1)?.[0].text ?? "";
  const codigo = ultimo.match(/: (\d{6})/u)?.[1];
  if (!codigo) throw new Error("código não enviado");
  return codigo;
}

beforeEach(() => {
  vi.clearAllMocks(); resetRateLimit();
  for (const key of Object.keys(storage)) delete storage[key];
  for (const key of ["user", "account", "session", "verification"]) storage[key] = [];
  real = criarAuth();
});

describe("códigos reais do better-auth", () => {
  it("recupera conta não verificada, invalida sessões e rejeita reutilização", async () => {
    const conta = await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    expect(conta.user.emailVerified).toBe(false);
    await real.api.verifyEmailOTP({ body: { email, otp: ultimoCodigo() } });
    expect(storage.session.length).toBeGreaterThan(0);
    await real.api.requestPasswordResetEmailOTP({ body: { email } });
    const otp = ultimoCodigo();
    expect(JSON.stringify(storage.verification)).not.toContain(otp);
    await real.api.resetPasswordEmailOTP({ body: { email, otp, password: "NovaSenha123" } });
    expect(storage.session).toHaveLength(0);
    await expect(real.api.resetPasswordEmailOTP({ body: { email, otp, password: "OutraSenha123" } })).rejects.toThrow();
    await expect(real.api.signInEmail({ body: { email, password: "Senha123" } })).rejects.toThrow();
    await expect(real.api.signInEmail({ body: { email, password: "NovaSenha123" } })).resolves.toBeTruthy();
  });

  it("recupera diretamente rascunho que ainda não confirmou e-mail", async () => {
    await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    await real.api.requestPasswordResetEmailOTP({ body: { email } });
    await real.api.resetPasswordEmailOTP({ body: { email, otp: ultimoCodigo(), password: "NovaSenha123" } });
    await expect(real.api.signInEmail({ body: { email, password: "NovaSenha123" } })).resolves.toBeTruthy();
  });

  it("código expirado e código de outra finalidade não servem para redefinir", async () => {
    await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    await expect(real.api.resetPasswordEmailOTP({ body: { email, otp: ultimoCodigo(), password: "NovaSenha123" } })).rejects.toThrow();
    await real.api.requestPasswordResetEmailOTP({ body: { email } });
    const otp = ultimoCodigo();
    const registro = storage.verification.find((v) => v.identifier === `forget-password-otp-${email}`)!;
    registro.expiresAt = new Date(Date.now() - 1000);
    await expect(real.api.resetPasswordEmailOTP({ body: { email, otp, password: "NovaSenha123" } })).rejects.toThrow();
  });

  it("a prova de reinício por sign-in é consumida uma única vez", async () => {
    await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    await real.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
    const otp = ultimoCodigo();
    const prova = await real.api.signInEmailOTP({ body: { email, otp }, returnHeaders: true });
    expect(prova.response.user.email).toBe(email);
    expect(prova.headers.getSetCookie().length).toBeGreaterThan(0);
    await expect(real.api.signInEmailOTP({ body: { email, otp } })).rejects.toThrow();
  });

  it("tentativa errada concorrente não ressuscita código já consumido", async () => {
    await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    await real.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
    const otp = ultimoCodigo();
    const errado = otp === "000000" ? "111111" : "000000";
    const resultados = await Promise.allSettled([
      real.api.signInEmailOTP({ body: { email, otp } }),
      real.api.signInEmailOTP({ body: { email, otp: errado } }),
    ]);
    expect(resultados[0].status).toBe("fulfilled");
    expect(resultados[1].status).toBe("rejected");
    await expect(real.api.signInEmailOTP({ body: { email, otp } })).rejects.toThrow();
  });

  it("somente uma redefinição concorrente pode consumir o mesmo código", async () => {
    await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    await real.api.requestPasswordResetEmailOTP({ body: { email } });
    const otp = ultimoCodigo();
    const resultados = await Promise.allSettled([
      real.api.resetPasswordEmailOTP({ body: { email, otp, password: "NovaSenha123" } }),
      real.api.resetPasswordEmailOTP({ body: { email, otp, password: "OutraSenha123" } }),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.filter((r) => r.status === "rejected")).toHaveLength(1);
  });

  it("três erros esgotam o código, e um novo envio permite recuperar", async () => {
    await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    await real.api.requestPasswordResetEmailOTP({ body: { email } });
    const otp = ultimoCodigo();
    const errado = otp === "000000" ? "111111" : "000000";
    for (let i = 0; i < 3; i++) {
      await expect(real.api.resetPasswordEmailOTP({ body: { email, otp: errado, password: "NovaSenha123" } })).rejects.toThrow();
    }
    await expect(real.api.resetPasswordEmailOTP({ body: { email, otp, password: "NovaSenha123" } })).rejects.toThrow();
    await real.api.requestPasswordResetEmailOTP({ body: { email } });
    await expect(real.api.resetPasswordEmailOTP({ body: { email, otp: ultimoCodigo(), password: "NovaSenha123" } })).resolves.toBeTruthy();
  });

  it("um código de outra conta não autoriza a redefinição", async () => {
    await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    await real.api.requestPasswordResetEmailOTP({ body: { email } });
    await expect(real.api.resetPasswordEmailOTP({ body: { email: "outra@example.com", otp: ultimoCodigo(), password: "NovaSenha123" } })).rejects.toThrow();
  });

  it("não cria conta por OTP para um endereço sem ONG", async () => {
    await real.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
    expect(sendEmail).not.toHaveBeenCalled();
    await expect(real.api.signInEmailOTP({ body: { email, otp: "123456" } })).rejects.toThrow();
    expect(storage.user ?? []).toHaveLength(0);
  });

  it("limita envios entre aliases, mesmo variando maiúsculas", async () => {
    await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    for (let i = 0; i < 3; i++) await real.api.requestPasswordResetEmailOTP({ body: { email } });
    const codigosAntes = storage.verification.length;
    // e-mail válido para o better-auth: só o limitador (que normaliza) pode recusar
    await expect(real.api.sendVerificationOTP({ body: { email: "ONG@Example.com", type: "sign-in" } })).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(vi.mocked(sendEmail).mock.calls).toHaveLength(4);
    expect(storage.verification).toHaveLength(codigosAntes);
  });

  it.each([
    "/email-otp/check-verification-otp",
    "/sign-in/email-otp",
    "/email-otp/request-password-reset",
    "/forget-password/email-otp",
    "/email-otp/reset-password",
    "/request-password-reset",
    "/delete-user",
  ])("POST /api/auth%s fica fechado pelo HTTP", async (rota) => {
    const resposta = await real.handler(
      new Request(`http://localhost:3000/api/auth${rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({ email, type: "forget-password", otp: "000000" }),
      })
    );
    expect(resposta.status).toBe(404);
  });

  it("o servidor continua pedindo o código de recuperação pela API interna", async () => {
    await real.api.signUpEmail({ body: { email, name: "Casa", password: "Senha123" } });
    await real.api.requestPasswordResetEmailOTP({ body: { email } });
    expect(vi.mocked(sendEmail).mock.calls).toHaveLength(2);
  });
});
