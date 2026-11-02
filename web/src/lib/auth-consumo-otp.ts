import { randomBytes } from "node:crypto";
import { APIError, createAuthMiddleware } from "better-auth/api";

const ROTAS = new Set(["/sign-in/email-otp", "/email-otp/reset-password", "/email-otp/verify-email"]);
const PREFIXO = "consumido:";

/**
 * O helper OTP do better-auth 1.5.5 lê e apaga separadamente. Uma chamada concorrente
 * pode recriar um código já usado. Aqui a primeira leitura reivindica o registro com
 * uma atualização condicional do próprio adapter, compartilhada entre instâncias.
 * A marca fica até expirar. Erros só atualizam o MESMO registro, sem recriar gerações.
 */
export const protegerConsumoOtp = createAuthMiddleware(async (ctx) => {
  if (!ctx.path || !ROTAS.has(ctx.path)) return;
  if (ctx.context.options.secondaryStorage) {
    throw new APIError("INTERNAL_SERVER_ERROR", { message: "Armazenamento de códigos incompatível com o consumo seguro." });
  }
  const base = ctx.context.internalAdapter;
  const adapter = ctx.context.adapter;
  type Registro = NonNullable<Awaited<ReturnType<typeof base.findVerificationValue>>>;
  const consumidos = new Map<string, { registro: Registro; marca: string }>();

  // Contexto exclusivo desta chamada; nunca alterar os métodos do adapter compartilhado.
  ctx.context.internalAdapter = {
    ...base,
    async findVerificationValue(identifier) {
      if (consumidos.has(identifier)) return null;
      const encontrado = await base.findVerificationValue(identifier);
      const registro = encontrado ? { ...encontrado } : null;
      if (!registro || registro.expiresAt <= new Date() || registro.value.startsWith(PREFIXO)) return null;
      const marca = PREFIXO + randomBytes(24).toString("hex");
      const count = await adapter.updateMany({ model: "verification", where: [
        { field: "id", value: registro.id },
        { field: "value", value: registro.value },
        { field: "expiresAt", operator: "gt", value: new Date() },
      ], update: { value: marca } });
      if (count !== 1) return null;
      consumidos.set(identifier, { registro, marca });
      return registro;
    },
    async deleteVerificationByIdentifier(identifier) {
      if (!consumidos.has(identifier)) await base.deleteVerificationByIdentifier(identifier);
    },
    async createVerificationValue(data) {
      const consumo = consumidos.get(data.identifier);
      if (!consumo) return base.createVerificationValue(data);
      // Tentativa incorreta: preserva a geração e sua contagem original de tentativas.
      const count = await adapter.updateMany({ model: "verification", where: [
        { field: "id", value: consumo.registro.id }, { field: "value", value: consumo.marca },
      ], update: { value: data.value } });
      if (count !== 1) throw new APIError("BAD_REQUEST", { message: "Código inválido ou já utilizado." });
      return { ...consumo.registro, ...data };
    },
  };
});
