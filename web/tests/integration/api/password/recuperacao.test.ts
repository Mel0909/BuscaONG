import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { APIError } from "better-auth/api";
import { auth } from "@/auth";
import { resetRateLimit } from "@/utils/api/server/rateLimit";
import { POST as solicitar } from "@/backend/api/password/forgot/route";
import { POST as confirmar } from "@/backend/api/password/reset/route";

const api = auth.api as unknown as { requestPasswordResetEmailOTP: ReturnType<typeof vi.fn>; resetPasswordEmailOTP: ReturnType<typeof vi.fn> };
api.requestPasswordResetEmailOTP = vi.fn();
api.resetPasswordEmailOTP = vi.fn();

function request(corpo: unknown, raw = false) {
  return new NextRequest("http://localhost:3000/api/password/reset", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: raw ? String(corpo) : JSON.stringify(corpo),
  });
}
const dados = { email: "ONG@EXAMPLE.COM ", codigo: "123456", newPassword: "NovaSenha123" };

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimit();
  api.requestPasswordResetEmailOTP.mockResolvedValue({ success: true });
  api.resetPasswordEmailOTP.mockResolvedValue({ success: true });
});

describe("recuperação de acesso", () => {
  it("é pública, normaliza o e-mail e usa better-auth", async () => {
    const req = request({ email: dados.email });
    expect((await solicitar(req)).status).toBe(200);
    expect(api.requestPasswordResetEmailOTP).toHaveBeenCalledWith({ body: { email: "ong@example.com" }, headers: req.headers });
  });

  it("não revela existência de conta nem falhas do provedor", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const normal = await solicitar(request({ email: "ong@example.com" }));
    api.requestPasswordResetEmailOTP.mockRejectedValue(new Error("segredo-do-provedor"));
    const falha = await solicitar(request({ email: "ausente@example.com" }));
    expect(falha.status).toBe(normal.status);
    expect(await falha.json()).toEqual(await normal.json());
    expect(log).toHaveBeenCalledWith("Não foi possível solicitar a recuperação de acesso.");
    log.mockRestore();
  });

  it("redefine pelo código, sem sessão e sem usar Prisma", async () => {
    const req = request(dados);
    expect((await confirmar(req)).status).toBe(200);
    expect(api.resetPasswordEmailOTP).toHaveBeenCalledWith({
      body: { email: "ong@example.com", otp: "123456", password: "NovaSenha123" }, headers: req.headers,
    });
  });

  it.each(["fraca", "aaaaaaaa", "SENHA123", "SenhaSemNumero"])("recusa senha fraca: %s", async (newPassword) => {
    expect((await confirmar(request({ ...dados, newPassword }))).status).toBe(400);
    expect(api.resetPasswordEmailOTP).not.toHaveBeenCalled();
  });

  it.each(["", "12345", "1234567", "abcdef"])("recusa código inválido: %s", async (codigo) => {
    expect((await confirmar(request({ ...dados, codigo }))).status).toBe(400);
    expect(api.resetPasswordEmailOTP).not.toHaveBeenCalled();
  });

  it("traduz código expirado ou reutilizado sem expor detalhes", async () => {
    api.resetPasswordEmailOTP.mockRejectedValue(new APIError("BAD_REQUEST", { message: "INVALID_OTP" }));
    const response = await confirmar(request(dados));
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).not.toContain("INVALID_OTP");
  });

  it.each([solicitar, confirmar])("recusa JSON malformado e campos extras", async (rota) => {
    expect((await rota(request("{", true))).status).toBe(400);
    expect((await rota(request({ ...dados, userId: "outra-conta" }))).status).toBe(400);
  });

  it("limita solicitações por IP antes de enviar e-mail", async () => {
    for (let i = 0; i < 5; i++) await solicitar(request({ email: `ong${i}@example.com` }));
    const response = await solicitar(request({ email: "ong6@example.com" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
    expect(api.requestPasswordResetEmailOTP).toHaveBeenCalledTimes(5);
  });
});
