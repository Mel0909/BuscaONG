import prisma from "@/backend/services/db";
import type { Ong } from "@prisma/client";
import { urlPublica } from "@/lib/armazenamento";
import { ATIVIDADE_OUTRA, DIAS_VOLUNTARIADO, formatarHorario } from "@/lib/cadastro/voluntariado";
import type { ContatosVisiveis } from "@/lib/ong/contatos";
import { ehObjectId } from "@/lib/ong/slug";
import { itemLivre, urgenciaAtiva } from "@/lib/ong/urgencia";
import { nomesDasListas, type Nomes } from "./publico";

// Página pública da ONG (P5): só ONGs publicadas. O que a ONG marcou como não visível
// (contatos desmarcados, endereço exato de quem mostra só o bairro) não sai daqui.

export type UrgenciaPublica = { item: string; nome: string; detalhe: string | null; criadaEm: string; ate: string };

export type PerfilPublico = {
  id: string;
  /** endereço da página: o slug, ou o ID para quem publicou antes de existir slug */
  endereco: string;
  nome: string;
  descricaoCurta: string;
  sobre: string | null;
  logoUrl: string | null;
  capaUrl: string | null;
  causas: string[];
  /** bairro (ou cidade) */
  local: string | null;
  /** "Rua Domingos de Morais, 120 · Vila Mariana · São Paulo/SP", ou só o bairro e a cidade */
  enderecoTexto: string;
  posicao: { latitude: number; longitude: number; aproximada: boolean } | null;
  urgencias: UrgenciaPublica[];
  /** "Sempre precisa": os itens que não estão urgentes, lista fixa primeiro */
  itens: string[];
  voluntariado: { horarios: { dia: string; horario: string; atividade: string }[]; requisitos: string | null } | null;
  contatos: ContatosVisiveis;
};

const NOME_DO_DIA = new Map(DIAS_VOLUNTARIADO.map((d) => [d.valor, d.nome]));

/** Itens da ONG com a chave usada nas urgências (slug ou "livre:<chave>") e o nome. */
export function itensDaOng(ong: Pick<Ong, "itens" | "itensLivres">, nomes: Nomes["ITEM"]) {
  return [
    ...ong.itens.map((slug) => ({ item: slug, nome: nomes.get(slug) ?? slug, livre: false })),
    ...ong.itensLivres.map((i) => ({ item: itemLivre(i.chave), nome: i.nome, livre: true })),
  ];
}

/** Urgências que ainda valem, das mais recentes para as mais antigas. */
export function urgenciasAtivas(ong: Pick<Ong, "urgencias">, agora = new Date()): UrgenciaPublica[] {
  return (ong.urgencias ?? [])
    .filter((u) => urgenciaAtiva(u, agora))
    .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime())
    .map((u) => ({
      item: u.item,
      nome: u.nome,
      detalhe: u.detalhe ?? null,
      criadaEm: u.criadaEm.toISOString(),
      ate: u.ate.toISOString(),
    }));
}

function contatosVisiveis(ong: Ong): ContatosVisiveis {
  const c = ong.contatos;
  const visiveis: ContatosVisiveis = {};
  for (const tipo of ["whatsapp", "email", "site", "instagram"] as const) {
    const contato = c?.[tipo];
    if (contato?.visivel && contato.valor) visiveis[tipo] = contato.valor;
  }
  return visiveis;
}

/** A ONG publicada com este endereço (slug ou ID), ou null. */
export async function buscarOngPublicada(endereco: string) {
  const onde = ehObjectId(endereco) ? { OR: [{ slug: endereco }, { id: endereco }] } : { slug: endereco };
  return prisma.ong.findFirst({ where: { ...onde, status: "PUBLICADA" } });
}

export async function perfilPublico(endereco: string): Promise<PerfilPublico | null> {
  const ong = await buscarOngPublicada(endereco);
  if (!ong) return null;

  const nomes = await nomesDasListas();
  const urgencias = urgenciasAtivas(ong);
  const urgentes = new Set(urgencias.map((u) => u.item));
  const e = ong.endereco;

  let posicao: PerfilPublico["posicao"] = null;
  // só a posição pública (a sorteada perto do endereço, para quem mostra só o bairro)
  if (ong.localizacaoPublica) {
    const [longitude, latitude] = ong.localizacaoPublica.coordinates;
    posicao = { latitude, longitude, aproximada: ong.mostrarSoBairro };
  }

  const rua = e && !ong.mostrarSoBairro ? [e.logradouro, e.numero].filter(Boolean).join(", ") : null;
  const cidade = e ? `${e.municipio}/${e.uf}` : null;

  return {
    id: ong.id,
    endereco: ong.slug ?? ong.id,
    nome: ong.nomePublico ?? "",
    descricaoCurta: ong.descricaoCurta ?? "",
    sobre: ong.sobre,
    logoUrl: ong.logo ? urlPublica(ong.logo) : null,
    capaUrl: ong.capa ? urlPublica(ong.capa) : null,
    causas: ong.causas.map((slug) => nomes.CAUSA.get(slug) ?? slug),
    local: e?.bairro || e?.municipio || null,
    enderecoTexto: [rua, e?.bairro, cidade].filter(Boolean).join(" · "),
    posicao,
    urgencias,
    itens: itensDaOng(ong, nomes.ITEM)
      .filter((i) => !urgentes.has(i.item))
      .map((i) => i.nome),
    voluntariado:
      ong.aceitaVoluntarios && ong.horariosVoluntariado.length > 0
        ? {
            horarios: ong.horariosVoluntariado.map((h) => ({
              dia: NOME_DO_DIA.get(h.dia) ?? h.dia,
              horario: formatarHorario(h.inicio, h.fim),
              atividade:
                h.atividade === ATIVIDADE_OUTRA ? (h.atividadeOutra ?? "") : (nomes.ATIVIDADE.get(h.atividade) ?? h.atividade),
            })),
            requisitos: ong.requisitosVoluntariado,
          }
        : null,
    contatos: contatosVisiveis(ong),
  };
}
