// Upload de imagens das ONGs para o Cloudflare R2 (compatível com a API do S3).
// O navegador envia o arquivo direto para o R2 com uma URL assinada pelo servidor;
// o arquivo não passa pelo servidor do app.
import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TIPOS_IMAGEM, type TipoImagem } from "@/lib/cadastro/limites";

const VALIDADE_URL_SEGUNDOS = 5 * 60;

function config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  return {
    bucket: R2_BUCKET,
    urlPublica: R2_PUBLIC_URL.replace(/\/$/, ""),
    client: new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    }),
  };
}

/** false quando faltam as variáveis R2_* no ambiente: o envio de imagens fica desligado. */
export function armazenamentoDisponivel(): boolean {
  return config() !== null;
}

export class ArmazenamentoIndisponivelError extends Error {
  constructor() {
    super("O envio de imagens não está configurado");
    this.name = "ArmazenamentoIndisponivelError";
  }
}

/** URL pública de um arquivo, a partir da chave guardada no banco. */
export function urlPublica(chave: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  return `${base}/${chave}`;
}

/**
 * Gera a chave do arquivo e uma URL assinada para o navegador enviar com PUT.
 * O tipo e o tamanho entram na assinatura: o R2 recusa um arquivo diferente do declarado.
 */
export async function urlDeEnvio(prefixo: string, contentType: TipoImagem, tamanho: number) {
  const r2 = config();
  if (!r2) throw new ArmazenamentoIndisponivelError();

  const chave = `${prefixo}-${randomUUID()}.${TIPOS_IMAGEM[contentType]}`;
  const urlEnvio = await getSignedUrl(
    r2.client,
    new PutObjectCommand({ Bucket: r2.bucket, Key: chave, ContentType: contentType, ContentLength: tamanho }),
    { expiresIn: VALIDADE_URL_SEGUNDOS }
  );

  return { chave, urlEnvio, url: `${r2.urlPublica}/${chave}` };
}

/**
 * Apaga um arquivo do bucket (ex.: imagem removida pela equipe, para o link antigo parar de abrir).
 * Sem o R2 configurado, não faz nada.
 */
export async function apagarArquivo(chave: string): Promise<void> {
  const r2 = config();
  if (!r2) return;
  await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: chave }));
}
