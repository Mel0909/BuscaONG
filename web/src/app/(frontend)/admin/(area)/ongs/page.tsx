import Link from "next/link";

import { filtroOngsAdminSchema, type FiltroOngsAdmin } from "@/backend/schemas";
import { contarOngsAdmin, fichaOngAdmin, listarOngsAdmin } from "@/backend/services/admin";
import { cn } from "@/lib/utils";
import { ehObjectId } from "@/lib/ong/slug";
import { AcoesOng, CabecalhoFicha, ComparacaoReceita, ContatosDaOng, SinaisDaOng } from "../_components/FichaOng";
import { ChipFiltro, estiloCabecalhoTabela, estiloCampoAdmin, ListaEFicha, Selo } from "../_components/ui";
import { carregarAdmin, parametro } from "../_utils/carregarAdmin";

const FILTROS: { valor: FiltroOngsAdmin; nome: string }[] = [
  { valor: "todas", nome: "Todas" },
  { valor: "ativas", nome: "Ativas" },
  { valor: "suspensas", nome: "Suspensas" },
  { valor: "cnpj", nome: "CNPJ com problema" },
  { valor: "denunciadas", nome: "Denunciadas" },
  { valor: "rascunhos", nome: "Cadastro não terminado" },
];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const COLUNAS = "grid grid-cols-[1.6fr_1.3fr_1fr_110px_80px_80px] items-center gap-2";

// A1: gestão de ONGs, com a ficha da selecionada à direita
export default async function AdminOngsPage({ searchParams }: Props) {
  await carregarAdmin();
  const params = await searchParams;
  const { filtro, q } = filtroOngsAdminSchema.parse({ filtro: parametro(params.filtro) || undefined, q: parametro(params.q) });
  const selecionada = parametro(params.ong);

  const [contagem, ongs, ficha] = await Promise.all([
    contarOngsAdmin(),
    listarOngsAdmin(filtro, q),
    ehObjectId(selecionada) ? fichaOngAdmin(selecionada) : null,
  ]);

  const url = (mudancas: Record<string, string>) => {
    const p = new URLSearchParams({ ...(filtro !== "todas" ? { filtro } : {}), ...(q ? { q } : {}), ...mudancas });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    return `/admin/ongs?${p}`;
  };

  const lista = (
    <>
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <form action="/admin/ongs" className="min-w-0 flex-1">
          {filtro !== "todas" && <input type="hidden" name="filtro" value={filtro} />}
          <input type="search" name="q" defaultValue={q} placeholder="Nome, CNPJ ou cidade" aria-label="Buscar ONG" className={estiloCampoAdmin} />
        </form>
        <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
          {FILTROS.map((f) => (
            <ChipFiltro key={f.valor} href={url({ filtro: f.valor === "todas" ? "" : f.valor, ong: "" })} ativo={filtro === f.valor}>
              {f.nome} {contagem[f.valor]}
            </ChipFiltro>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-cinza-borda bg-branco">
        <div className="min-w-[720px]">
          <div className={cn(COLUNAS, estiloCabecalhoTabela)}>
            <span>ONG</span>
            <span>CNPJ</span>
            <span>Cidade</span>
            <span>Status</span>
            <span>Urgências</span>
            <span>Denúncias</span>
          </div>
          {ongs.length === 0 && <p className="border-t border-cinza-linha px-4 py-6 text-sm text-cinza-texto">Nenhuma ONG encontrada.</p>}
          {ongs.map((o) => (
            <Link
              key={o.id}
              href={url({ ong: o.id })}
              aria-current={o.id === selecionada ? "true" : undefined}
              className={cn(
                COLUNAS,
                "border-t border-cinza-linha px-4 py-[11px] text-[13px] font-medium hover:bg-cinza-fundo",
                o.id === selecionada && "bg-cinza-cabecalho"
              )}
            >
              <span className="truncate font-semibold">{o.nome}</span>
              <span className="font-mono text-xs text-tinta-suave">{o.cnpj}</span>
              <span className="truncate text-cinza-texto">{o.cidade ?? "—"}</span>
              <span>
                {o.revisar ? (
                  <Selo tipo="alerta">Revisar</Selo>
                ) : o.status === "PUBLICADA" ? (
                  <Selo tipo="ok">Ativa</Selo>
                ) : o.status === "SUSPENSA" ? (
                  <Selo tipo="neutro">Suspensa</Selo>
                ) : (
                  <Selo tipo="neutro">Rascunho</Selo>
                )}
              </span>
              <span className="tabular-nums">{o.urgencias}</span>
              <span className="tabular-nums">{o.denuncias}</span>
            </Link>
          ))}
        </div>
      </div>
      {ongs.length === 300 && <p className="text-xs text-cinza-texto">Mostrando as 300 primeiras. Use a busca para achar outras.</p>}
    </>
  );

  const painel = ficha ? (
    <>
      <CabecalhoFicha ficha={ficha}>
        {ficha.status === "SUSPENSA" && <Selo tipo="neutro">Suspensa</Selo>}
        {ficha.status === "RASCUNHO" && <span className="text-xs text-cinza-texto">Cadastro ainda não publicado</span>}
      </CabecalhoFicha>
      <ContatosDaOng ficha={ficha} />
      <ComparacaoReceita ficha={ficha} />
      <SinaisDaOng sinais={ficha.sinais} />
      <AcoesOng key={ficha.id} ficha={ficha} />
    </>
  ) : (
    <p className="text-[13px] leading-normal text-cinza-texto">
      Escolha uma ONG na lista para ver os contatos, a comparação com a Receita e as ações. O admin não edita perfis:
      suspende, reativa ou exclui, sempre com motivo.
    </p>
  );

  return <ListaEFicha lista={lista} ficha={painel} />;
}
