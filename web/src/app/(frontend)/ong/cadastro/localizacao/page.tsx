import type { Ong } from "@/generated/prisma";
import { capitalizarNome } from "@/utils/formatters/receita";
import { formatarCep } from "@/utils/validations/endereco";
import { PassoLocalizacao, type EnderecoForm } from "../_components/PassoLocalizacao";
import { carregarPasso } from "../_utils/carregarPasso";

// endereço salvo; se ainda não há, o da Receita (a menos que a ONG tenha dito que mudou)
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

// passo 3 de 8
export default async function CadastroLocalizacaoPage() {
  const { ong } = await carregarPasso(3);
  const [longitude, latitude] = ong.localizacao?.coordinates ?? [];

  return (
    <PassoLocalizacao
      enderecoInicial={enderecoInicial(ong)}
      posicaoInicial={latitude !== undefined ? { latitude, longitude } : null}
      mostrarSoBairroInicial={ong.mostrarSoBairro}
      daReceita={!ong.endereco && ong.usarEnderecoReceita && !!ong.enderecoReceita}
    />
  );
}
