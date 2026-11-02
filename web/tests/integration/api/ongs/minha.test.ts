import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/backend/services/db";
import { distanciaKm } from "@/lib/mapa/geo";
import { setCurrentRole } from "../../mocks/auth";

vi.mock("@/backend/services/db", () => ({
  default: {
    ong: { findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    opcaoLista: { findMany: vi.fn() },
  },
}));

import { PUT as putLocalizacao } from "@/backend/api/ongs/minha/localizacao/route";
import { PUT as putContatos } from "@/backend/api/ongs/minha/contatos/route";
import { PUT as putCausasItens } from "@/backend/api/ongs/minha/causas-itens/route";
import { PUT as putVoluntariado } from "@/backend/api/ongs/minha/voluntariado/route";
import { PUT as putApresentacao } from "@/backend/api/ongs/minha/apresentacao/route";
import { POST as postImagens } from "@/backend/api/ongs/minha/imagens/route";
import { POST as postPublicacao } from "@/backend/api/ongs/minha/publicacao/route";

const db = vi.mocked(prisma, { deep: true });

const ONG_ID = "6ae649983bbad49560772d32";

// ONG em rascunho no passo 3, como sai do passo 2
const ongRascunho = (extra: Record<string, unknown> = {}) => ({
  id: ONG_ID,
  userId: "test-user-id",
  status: "RASCUNHO",
  passoAtual: 3,
  localizacao: null,
  contatos: null,
  causas: [],
  itens: [],
  itensLivres: [],
  nomePublico: null,
  descricaoCurta: null,
  logo: null,
  capa: null,
  ...extra,
});

const ongCompleta = () =>
  ongRascunho({
    passoAtual: 8,
    localizacao: { type: "Point", coordinates: [-46.6, -23.5] },
    contatos: { whatsapp: { valor: "+5511971234567", visivel: true } },
    causas: ["saude"],
    itens: ["fraldas"],
    nomePublico: "Casa Lar",
    descricaoCurta: "Acolhemos crianças.",
  });

const requisicao = (metodo: string, secao: string, body: unknown) =>
  new NextRequest(`http://localhost:3000/api/ongs/minha/${secao}`, {
    method: metodo,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

const dadosDoUpdate = () => db.ong.update.mock.calls[0][0].data;

const opcoes = (...slugs: string[]) => slugs.map((slug) => ({ slug, nome: slug }));

describe("rotas /api/ongs/minha/*", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCurrentRole("ONG");
    db.ong.findUnique.mockResolvedValue(ongRascunho() as never);
    db.ong.update.mockImplementation((async (args: { data: Record<string, unknown> }) => ({
      id: ONG_ID,
      status: "RASCUNHO",
      passoAtual: args.data.passoAtual ?? 3,
    })) as never);
  });

  describe("acesso", () => {
    const corpo = {
      endereco: { logradouro: "Rua A", bairro: "Centro", municipio: "São Paulo", uf: "SP", cep: "01001-000" },
      latitude: -23.5,
      longitude: -46.6,
    };

    it("401 sem login", async () => {
      setCurrentRole(null);
      const response = await putLocalizacao(requisicao("PUT", "localizacao", corpo));
      expect(response.status).toBe(401);
      expect(db.ong.update).not.toHaveBeenCalled();
    });

    it("403 para admin (só a conta da ONG mexe no cadastro)", async () => {
      setCurrentRole("ADMIN");
      const response = await putLocalizacao(requisicao("PUT", "localizacao", corpo));
      expect(response.status).toBe(403);
    });

    it("404 quando a conta não tem ONG", async () => {
      db.ong.findUnique.mockResolvedValue(null);
      const response = await putLocalizacao(requisicao("PUT", "localizacao", corpo));
      expect(response.status).toBe(404);
    });

    it("busca a ONG pelo usuário da sessão, nunca por ID enviado", async () => {
      await putLocalizacao(requisicao("PUT", "localizacao", corpo));
      expect(db.ong.findUnique).toHaveBeenCalledWith({ where: { userId: "test-user-id" } });
    });
  });

  it("passo 3 grava o ponto GeoJSON [lng, lat] e libera o passo 4", async () => {
    const response = await putLocalizacao(
      requisicao("PUT", "localizacao", {
        endereco: {
          logradouro: "Rua Domingos de Morais",
          numero: "1200",
          bairro: "Vila Mariana",
          municipio: "São Paulo",
          uf: "SP",
          cep: "04010-100",
        },
        latitude: -23.5893,
        longitude: -46.6345,
        mostrarSoBairro: true,
      })
    );

    expect(response.status).toBe(200);
    expect(dadosDoUpdate()).toMatchObject({
      localizacao: { type: "Point", coordinates: [-46.6345, -23.5893] },
      endereco: { cep: "04010100" },
      mostrarSoBairro: true,
      passoAtual: 4,
    });
  });

  describe("posição pública (passo 3)", () => {
    const corpoLocalizacao = (mostrarSoBairro: boolean, latitude = -23.5893) => ({
      endereco: { logradouro: "Rua A", bairro: "Centro", municipio: "São Paulo", uf: "SP", cep: "01001-000" },
      latitude,
      longitude: -46.6345,
      mostrarSoBairro,
    });
    const publica = () => (dadosDoUpdate().localizacaoPublica as { coordinates: [number, number] }).coordinates;

    it("sem 'só o bairro', a posição pública é a real", async () => {
      await putLocalizacao(requisicao("PUT", "localizacao", corpoLocalizacao(false)));
      expect(publica()).toEqual([-46.6345, -23.5893]);
    });

    it("com 'só o bairro', sorteia um ponto a 150-400 m e guarda", async () => {
      await putLocalizacao(requisicao("PUT", "localizacao", corpoLocalizacao(true)));
      const [longitude, latitude] = publica();
      const distancia = distanciaKm({ latitude: -23.5893, longitude: -46.6345 }, { latitude, longitude });
      expect(distancia).toBeGreaterThanOrEqual(0.149);
      expect(distancia).toBeLessThanOrEqual(0.401);
    });

    it("salvar de novo o mesmo ponto mantém o sorteio; mudar o ponto sorteia outro", async () => {
      const sorteada = { type: "Point", coordinates: [-46.637, -23.587] };
      db.ong.findUnique.mockResolvedValue(
        ongRascunho({ localizacao: { type: "Point", coordinates: [-46.6345, -23.5893] }, localizacaoPublica: sorteada, mostrarSoBairro: true }) as never
      );
      await putLocalizacao(requisicao("PUT", "localizacao", corpoLocalizacao(true)));
      expect(publica()).toEqual(sorteada.coordinates);

      db.ong.update.mockClear();
      await putLocalizacao(requisicao("PUT", "localizacao", corpoLocalizacao(true, -23.59)));
      expect(publica()).not.toEqual(sorteada.coordinates);
    });
  });

  it("voltar a um passo anterior não reduz o passoAtual", async () => {
    db.ong.findUnique.mockResolvedValue(ongRascunho({ passoAtual: 7 }) as never);
    await putContatos(requisicao("PUT", "contatos", { email: { valor: "contato@casalar.org.br", visivel: true } }));
    expect(dadosDoUpdate().passoAtual).toBe(7);
  });

  it("passo 4 responde 400 sem contato visível", async () => {
    const response = await putContatos(
      requisicao("PUT", "contatos", { whatsapp: { valor: "(11) 97123-4567", visivel: false } })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.details[0].campo).toBe("whatsapp");
  });

  describe("passo 5", () => {
    it("item livre com o nome de um item da lista vira o item da lista", async () => {
      db.opcaoLista.findMany.mockImplementation((async (args: { where: { tipo: string; slug?: { in: string[] } } }) => {
        if (args.where.slug) return opcoes(...args.where.slug.in);
        return [{ slug: "remedios", nome: "Remédios" }];
      }) as never);

      const response = await putCausasItens(
        requisicao("PUT", "causas-itens", {
          causas: ["saude"],
          itens: ["fraldas"],
          itensLivres: ["remedios", "Cadeira  de rodas", "cadeira de rodas"],
        })
      );

      expect(response.status).toBe(200);
      expect(dadosDoUpdate()).toMatchObject({
        causas: ["saude"],
        itens: ["fraldas", "remedios"],
        itensLivres: [{ nome: "Cadeira de rodas", chave: "cadeira de rodas" }],
        passoAtual: 6,
      });
    });

    it("item que sai da lista leva junto a urgência dele", async () => {
      const urgencia = (item: string) => ({ item, nome: item, detalhe: null, criadaEm: new Date(), ate: new Date(Date.now() + 86_400_000) });
      db.ong.findUnique.mockResolvedValue(
        ongRascunho({ urgencias: [urgencia("fraldas"), urgencia("livre:ventilador"), urgencia("livre:cadeira de rodas")] }) as never
      );
      db.opcaoLista.findMany.mockImplementation((async (args: { where: { slug?: { in: string[] } } }) =>
        args.where.slug ? opcoes(...args.where.slug.in) : []) as never);

      await putCausasItens(requisicao("PUT", "causas-itens", { causas: ["saude"], itens: [], itensLivres: ["Cadeira de rodas"] }));

      expect(dadosDoUpdate().urgencias).toEqual([expect.objectContaining({ item: "livre:cadeira de rodas" })]);
    });

    it("400 para causa que não está na lista", async () => {
      db.opcaoLista.findMany.mockResolvedValue([] as never);
      const response = await putCausasItens(
        requisicao("PUT", "causas-itens", { causas: ["inventada"], itens: ["fraldas"] })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.details[0].campo).toBe("causas");
      expect(db.ong.update).not.toHaveBeenCalled();
    });
  });

  it("passo 6 calcula os turnos e descarta o texto de 'outra' em atividades da lista", async () => {
    db.opcaoLista.findMany.mockResolvedValue(opcoes("recreacao") as never);

    const response = await putVoluntariado(
      requisicao("PUT", "voluntariado", {
        aceitaVoluntarios: true,
        horarios: [
          { dia: "SABADO", inicio: 8, fim: 12, atividade: "recreacao", atividadeOutra: "ignorado" },
          { dia: "QUARTA", inicio: 14, fim: 19, atividade: "outra", atividadeOutra: "Fisioterapia" },
        ],
        requisitos: "",
      })
    );

    expect(response.status).toBe(200);
    expect(dadosDoUpdate()).toMatchObject({
      aceitaVoluntarios: true,
      requisitosVoluntariado: null,
      horariosVoluntariado: [
        { dia: "SABADO", atividadeOutra: null, turnos: ["MANHA"] },
        { dia: "QUARTA", atividadeOutra: "Fisioterapia", turnos: ["TARDE", "NOITE"] },
      ],
    });
  });

  describe("passo 7", () => {
    const corpo = { nomePublico: "Casa Lar", descricaoCurta: "Acolhemos crianças." };

    it("aceita imagem gerada para esta ONG", async () => {
      const response = await putApresentacao(
        requisicao("PUT", "apresentacao", { ...corpo, logo: `ongs/${ONG_ID}/logo-abc.png` })
      );
      expect(response.status).toBe(200);
      expect(dadosDoUpdate()).toMatchObject({ logo: `ongs/${ONG_ID}/logo-abc.png`, capa: null, sobre: null });
    });

    it("recusa chave de imagem de outra ONG", async () => {
      const response = await putApresentacao(
        requisicao("PUT", "apresentacao", { ...corpo, capa: "ongs/outra-ong/capa-abc.png" })
      );
      expect(response.status).toBe(400);
      expect(db.ong.update).not.toHaveBeenCalled();
    });

    it("pedir URL de envio sem o R2 configurado responde 503", async () => {
      // o cliente do Prisma carrega o web/.env; o teste não pode depender das chaves de quem roda
      for (const nome of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"]) {
        vi.stubEnv(nome, "");
      }
      try {
        const response = await postImagens(
          requisicao("POST", "imagens", { tipo: "logo", contentType: "image/png", tamanho: 1000 })
        );
        expect(response.status).toBe(503);
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });

  describe("passo 8", () => {
    it("422 com a lista do que falta", async () => {
      const response = await postPublicacao(requisicao("POST", "publicacao", { aceitaTermos: true }));
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.details.pendencias).toEqual(
        expect.arrayContaining(["localização no mapa", "um contato visível", "pelo menos uma causa"])
      );
    });

    it("400 sem aceitar os termos", async () => {
      db.ong.findUnique.mockResolvedValue(ongCompleta() as never);
      const response = await postPublicacao(requisicao("POST", "publicacao", { aceitaTermos: false }));
      expect(response.status).toBe(400);
    });

    it("publica e registra o aceite dos termos", async () => {
      db.ong.findUnique.mockResolvedValue(ongCompleta() as never);
      const response = await postPublicacao(requisicao("POST", "publicacao", { aceitaTermos: true }));

      expect(response.status).toBe(200);
      expect(dadosDoUpdate()).toMatchObject({
        status: "PUBLICADA",
        publicadaEm: expect.any(Date),
        termosAceitosEm: expect.any(Date),
        slug: "casa-lar",
      });
    });

    it("o endereço da página pula slugs já usados por outra ONG", async () => {
      db.ong.findUnique.mockResolvedValue(ongCompleta() as never);
      db.ong.findFirst.mockImplementation((async (args: { where: { slug: string } }) =>
        args.where.slug === "casa-lar" ? { id: "outra" } : null) as never);

      await postPublicacao(requisicao("POST", "publicacao", { aceitaTermos: true }));

      expect(dadosDoUpdate()).toMatchObject({ slug: "casa-lar-2" });
    });

    it("publicar de novo mantém o endereço da página", async () => {
      db.ong.findUnique.mockResolvedValue({ ...ongCompleta(), slug: "casa-lar-antigo", status: "PUBLICADA" } as never);
      const body = await (await postPublicacao(requisicao("POST", "publicacao", { aceitaTermos: true }))).json();

      expect(body.slug).toBe("casa-lar-antigo");
      expect(db.ong.update).not.toHaveBeenCalled();
    });

    it("403 para ONG suspensa", async () => {
      db.ong.findUnique.mockResolvedValue({ ...ongCompleta(), status: "SUSPENSA" } as never);
      const response = await postPublicacao(requisicao("POST", "publicacao", { aceitaTermos: true }));
      expect(response.status).toBe(403);
      expect(db.ong.update).not.toHaveBeenCalled();
    });
  });
});
