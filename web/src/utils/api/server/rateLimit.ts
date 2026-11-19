import { NextRequest, NextResponse } from "next/server";
import { erroJson } from "./respostas";

// Limite simples em memória (janela fixa por chave).
// Em ambiente serverless cada instância tem a própria contagem, então é uma proteção
// básica contra abuso, não uma garantia; para algo global, usar um store compartilhado.
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

type RateLimitOptions = { limit: number; windowMs: number };
export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  // limpeza oportunista para o Map não crescer sem fim
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Só para testes. */
export function resetRateLimit() {
  buckets.clear();
}

/** IP de quem fez a requisição (atrás de proxy, como na Vercel, vem no x-forwarded-for). */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconhecido";
}

export function tooManyRequests(retryAfterSeconds: number) {
  return erroJson(429, "Muitas requisições. Tente de novo em instantes.", {
    headers: { "Retry-After": String(retryAfterSeconds) },
  });
}
