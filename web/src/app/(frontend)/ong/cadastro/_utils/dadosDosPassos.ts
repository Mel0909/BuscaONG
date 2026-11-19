import type { Ong } from "@prisma/client";
import { urlPublica } from "@/lib/armazenamento";
import { capitalizarNome } from "@/utils/formatters/receita";
import { formatarWhatsapp } from "@/utils/validations/contatos";
import { formatarCep } from "@/utils/validations/endereco";
import type { ContatosForm } from "../_components/PassoContatos";
import type { EnderecoForm } from "../_components/PassoLocalizacao";

// O que cada formulário (passos 3 a 7) mostra ao abrir, a partir da ONG salva.
// Usado pelas páginas do cadastro e do painel.

/** Endereço salvo; se ainda não há, o da Receita (a menos que a ONG tenha dito que mudou). */
function enderecoInicial(ong: Ong): EnderecoForm {
  if (ong.endereco) {
    const e = ong.endereco;
    return {
      logradouro: e.logradouro,
      numero: e.numero ?? "",
      complemento: e.complemento ?? "",
      bairro: e.bairro,
      municipio: e.municipio,
      uf: e.uf,
      cep: formatarCep(e.cep),
    };
  }

  const r = ong.usarEnderecoReceita ? ong.enderecoReceita : null;
  const rua = [r?.tipoLogradouro, r?.logradouro].filter(Boolean).join(" ");
  return {
    logradouro: rua ? capitalizarNome(rua) : "",
    numero: r?.numero && r.numero.toUpperCase() !== "SN" ? r.numero : "",
    complemento: r?.complemento ? capitalizarNome(r.complemento) : "",
    bairro: r?.bairro ? capitalizarNome(r.bairro) : "",
    municipio: r?.municipio ? capitalizarNome(r.municipio) : "",
    uf: r?.uf ?? "",
    cep: r?.cep ? formatarCep(r.cep) : "",
  };
}

/** Passo 3. */
export function dadosLocalizacao(ong: Ong) {
  const [longitude, latitude] = ong.localizacao?.coordinates ?? [];
  return {
    enderecoInicial: enderecoInicial(ong),
    posicaoInicial: latitude !== undefined ? { latitude, longitude } : null,
    mostrarSoBairroInicial: ong.mostrarSoBairro,
    daReceita: !ong.endereco && ong.usarEnderecoReceita && !!ong.enderecoReceita,
  };
}

const contatoVazio = { valor: "", visivel: true };

/** Passo 4. */
export function dadosContatos(ong: Ong): ContatosForm {
  const c = ong.contatos;
  return {
    whatsapp: c?.whatsapp ? { ...c.whatsapp, valor: formatarWhatsapp(c.whatsapp.valor) } : contatoVazio,
    email: c?.email ?? contatoVazio,
    site: c?.site ?? contatoVazio,
    instagram: c?.instagram ?? contatoVazio,
  };
}

/** Passo 5. */
export function dadosCausasItens(ong: Ong) {
  return { causas: ong.causas, itens: ong.itens, itensLivres: ong.itensLivres.map((i) => i.nome) };
}

/** Passo 6. */
export function dadosVoluntariado(ong: Ong) {
  return {
    aceitaVoluntarios: ong.aceitaVoluntarios,
    horarios: ong.horariosVoluntariado.map((h) => ({
      dia: h.dia,
      inicio: h.inicio,
      fim: h.fim,
      atividade: h.atividade,
      atividadeOutra: h.atividadeOutra ?? "",
    })),
    requisitos: ong.requisitosVoluntariado ?? "",
  };
}

const imagem = (chave: string | null) => (chave ? { chave, url: urlPublica(chave) } : null);

/** Passo 7. Na primeira visita, sugere a razão social como nome público. */
export function dadosApresentacao(ong: Ong) {
  return {
    nomePublico: ong.nomePublico ?? capitalizarNome(ong.razaoSocial),
    descricaoCurta: ong.descricaoCurta ?? "",
    sobre: ong.sobre ?? "",
    logo: imagem(ong.logo),
    capa: imagem(ong.capa),
  };
}
