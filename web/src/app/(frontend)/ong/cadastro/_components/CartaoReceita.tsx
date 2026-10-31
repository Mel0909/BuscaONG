import type { CnpjData } from "@/lib/cnpj";
import {
  capitalizarNome,
  formatarEndereco,
  formatarNaturezaJuridica,
} from "@/utils/formatters/receita";

type Props = {
  receita: CnpjData;
  /** marca situação e natureza como ok (✓); false quando o CNPJ não é elegível */
  elegivel: boolean;
};

// "Encontrado na Receita Federal" do passo 1
export function CartaoReceita({ receita, elegivel }: Props) {
  const situacaoOk = receita.situacaoCadastral === "ATIVA";
  const naturezaOk = receita.naturezaJuridica.codigo?.startsWith("3") ?? false;
  const natureza = [
    formatarNaturezaJuridica(receita.naturezaJuridica.codigo),
    receita.naturezaJuridica.descricao,
  ]
    .filter(Boolean)
    .join(" · ");

  const marca = (ok: boolean) => (elegivel && ok ? "✓ " : "");

  return (
    <section
      aria-label="Dados encontrados na Receita Federal"
      className="flex flex-col gap-3.5 rounded-[18px] border border-borda-suave bg-papel px-6 py-[22px]"
    >
      <h2 className="text-xs font-bold uppercase tracking-[.06em] text-tinta-suave">
        Encontrado na Receita Federal
      </h2>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-[15px] sm:grid-cols-[180px_1fr]">
        <dt className="text-tinta-suave">Razão social</dt>
        <dd className="font-semibold">{capitalizarNome(receita.razaoSocial)}</dd>

        <dt className="text-tinta-suave">Situação</dt>
        <dd className={situacaoOk ? "font-semibold text-musgo" : "font-semibold"}>
          {marca(situacaoOk)}
          {capitalizarNome(receita.situacaoCadastral)}
        </dd>

        <dt className="text-tinta-suave">Natureza jurídica</dt>
        <dd className={naturezaOk ? "font-semibold text-musgo" : "font-semibold"}>
          {marca(naturezaOk)}
          {natureza}
        </dd>

        <dt className="text-tinta-suave">Endereço</dt>
        <dd>{formatarEndereco(receita.endereco)}</dd>
      </dl>
    </section>
  );
}
