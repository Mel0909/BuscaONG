import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CnpjLookupUnavailableError, CnpjNotFoundError, lookupCnpj } from "@/lib/cnpj";
import prisma from "@/backend/services/db";
import { resetRateLimit } from "@/utils/api/server";
import { returnParams } from "../../mocks/requests";
import { cnpjDataMock } from "../../mocks/cnpj";

vi.mock("@/lib/cnpj", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/cnpj")>()),
  lookupCnpj: vi.fn(),
}));

vi.mock("@/backend/services/db", () => ({
  default: { ong: { findUnique: vi.fn() } },
}));

import { GET } from "@/backend/api/cnpj/[cnpj]/route";

const lookupMock = vi.mocked(lookupCnpj);
const findUniqueMock = vi.mocked(prisma.ong.findUnique);

const CNPJ = "12345678000195";

function get(cnpj: string, ip = "1.1.1.1") {
  const request = new NextRequest(`http://localhost:3000/api/cnpj/${encodeURIComponent(cnpj)}`, {
    headers: { "x-forwarded-for": ip },
  });
  return GET(request, returnParams({ cnpj }) as { params: Promise<{ cnpj: string }> });
}

describe("GET /api/cnpj/[cnpj]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    findUniqueMock.mockResolvedValue(null);
  });

  it("devolve ELEGIVEL com os dados da Receita para uma ONG ativa", async () => {
    lookupMock.mockResolvedValue(cnpjDataMock());

    const response = await get("12.345.678/0001-95");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ELEGIVEL");
    expect(body.cnpj).toBe(CNPJ);
    expect(body.receita.razaoSocial).toBe("ASSOCIACAO CASA LAR ESPERANCA");
    expect(lookupMock).toHaveBeenCalledWith(CNPJ);
  });

  it("devolve 400 para CNPJ com dígito verificador inválido, sem consultar nada", async () => {
    const response = await get("12345678000196");

    expect(response.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it.each(["PUBLICADA", "SUSPENSA"])("devolve JA_CADASTRADO para ONG %s, sem consultar a Receita", async (status) => {
    findUniqueMock.mockResolvedValue({ id: "ong-1", cnpj: CNPJ, status } as never);

    const response = await get(CNPJ);
    const body = await response.json();

    expect(body).toEqual({ status: "JA_CADASTRADO", cnpj: CNPJ });
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("devolve EM_ANDAMENTO (não 'já cadastrado') para cadastro não publicado", async () => {
    findUniqueMock.mockResolvedValue({ id: "ong-1", cnpj: CNPJ, status: "RASCUNHO" } as never);
    lookupMock.mockResolvedValue(cnpjDataMock());

    const body = await (await get(CNPJ)).json();

    expect(body).toMatchObject({ status: "EM_ANDAMENTO", cnpj: CNPJ, receita: { cnpj: CNPJ } });
  });

  it("devolve NAO_ELEGIVEL quando a situação não é ATIVA", async () => {
    lookupMock.mockResolvedValue(cnpjDataMock({ situacaoCadastral: "BAIXADA" }));

    const body = await (await get(CNPJ)).json();

    expect(body.status).toBe("NAO_ELEGIVEL");
    expect(body.motivo).toBe("SITUACAO_NAO_ATIVA");
  });

  it("devolve NAO_ELEGIVEL para empresa com fins lucrativos", async () => {
    lookupMock.mockResolvedValue(
      cnpjDataMock({ naturezaJuridica: { codigo: "2062", descricao: "Sociedade Empresária Limitada" } })
    );

    const body = await (await get(CNPJ)).json();

    expect(body.status).toBe("NAO_ELEGIVEL");
    expect(body.motivo).toBe("NATUREZA_COM_FINS_LUCRATIVOS");
  });

  it("devolve NAO_ELEGIVEL para entidade sem fins lucrativos que não é ONG", async () => {
    lookupMock.mockResolvedValue(cnpjDataMock({ naturezaJuridica: { codigo: "3131", descricao: "Entidade Sindical" } }));

    const body = await (await get(CNPJ)).json();

    expect(body.status).toBe("NAO_ELEGIVEL");
    expect(body.motivo).toBe("NATUREZA_NAO_ACEITA");
  });

  it("devolve 404 quando o CNPJ não existe na Receita", async () => {
    lookupMock.mockRejectedValue(new CnpjNotFoundError(CNPJ));

    const response = await get(CNPJ);

    expect(response.status).toBe(404);
    expect((await response.json()).error.message).toMatch(/não encontrado/);
  });

  it("devolve 503 quando nenhuma API da Receita responde", async () => {
    lookupMock.mockRejectedValue(new CnpjLookupUnavailableError());

    const response = await get(CNPJ);

    expect(response.status).toBe(503);
  });

  it("devolve 429 depois de 20 consultas por minuto do mesmo IP", async () => {
    lookupMock.mockResolvedValue(cnpjDataMock());

    for (let i = 0; i < 20; i++) {
      expect((await get(CNPJ, "9.9.9.9")).status).toBe(200);
    }
    const bloqueada = await get(CNPJ, "9.9.9.9");

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers.get("Retry-After")).toBeTruthy();
    expect((await get(CNPJ, "8.8.8.8")).status).toBe(200);
  });
});
