import { filtroAcoesSchema, type CategoriaAcao } from "@/backend/schemas";
import { listarAcoes, NOME_DA_ACAO } from "@/backend/services/admin";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { ChipFiltro, dataCurta, estiloBotaoClaro, estiloCabecalhoTabela, estiloCampoAdmin, Selo } from "../_components/ui";
import { carregarAdmin, parametro } from "../_utils/carregarAdmin";

const CATEGORIAS: { valor: CategoriaAcao; nome: string }[] = [
  { valor: "todas", nome: "Todas" },
  { valor: "suspensoes", nome: "Suspensões" },
  { valor: "exclusoes", nome: "Exclusões" },
  { valor: "denuncias", nome: "Denúncias" },
  { valor: "listas", nome: "Listas" },
  { valor: "sistema", nome: "Sistema" },
];

const COLUNAS = "grid grid-cols-[110px_110px_170px_1.2fr_1.5fr] items-center gap-3";

/** "ana@buscaong.org" → "ana@" (como no protótipo: cabe na coluna e ainda identifica) */
const autor = (email: string | null) => (email ? `${email.split("@")[0]}@` : null);

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// A3: registro de ações. Somente leitura: nenhuma linha pode ser editada ou apagada.
export default async function AdminRegistroPage({ searchParams }: Props) {
  await carregarAdmin();
  const params = await searchParams;
  const { categoria, q } = filtroAcoesSchema.parse({ categoria: parametro(params.categoria) || undefined, q: parametro(params.q) });
  const acoes = await listarAcoes(categoria, q);

  const consulta = (c: CategoriaAcao) => new URLSearchParams({ ...(c !== "todas" ? { categoria: c } : {}), ...(q ? { q } : {}) });

  return (
    <div className="flex flex-col gap-3.5 px-4 py-5 md:px-6">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <form action="/admin/registro" className="min-w-0 flex-1">
          {categoria !== "todas" && <input type="hidden" name="categoria" value={categoria} />}
          <input type="search" name="q" defaultValue={q} placeholder="Buscar ONG, item ou admin" aria-label="Buscar no registro" className={estiloCampoAdmin} />
        </form>
        <div className="flex gap-2 overflow-x-auto">
          {CATEGORIAS.map((c) => (
            <ChipFiltro key={c.valor} href={`/admin/registro?${consulta(c.valor)}`} ativo={categoria === c.valor}>
              {c.nome}
            </ChipFiltro>
          ))}
          <a href={`/api/admin/acoes?${consulta(categoria)}`} className={cn(estiloBotaoClaro, "h-8 shrink-0")}>
            <Download className="size-3.5" aria-hidden="true" /> Exportar CSV
          </a>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-cinza-borda bg-branco">
        <div className="min-w-[860px]">
          <div className={cn(COLUNAS, estiloCabecalhoTabela)}>
            <span>Quando</span>
            <span>Quem</span>
            <span>Ação</span>
            <span>Alvo</span>
            <span>Motivo</span>
          </div>
          {acoes.length === 0 && <p className="border-t border-cinza-linha px-4 py-6 text-sm text-cinza-texto">Nenhuma ação registrada.</p>}
          {acoes.map((a) => (
            <div key={a.id} className={cn(COLUNAS, "border-t border-cinza-linha px-4 py-[11px] text-[13px]")}>
              <span className="font-mono text-xs text-cinza-texto">{dataCurta(a.createdAt)}</span>
              <span title={a.adminEmail ?? "ação automática"}>
                {a.adminEmail ? <span className="font-medium">{autor(a.adminEmail)}</span> : <Selo tipo="neutro">sistema</Selo>}
              </span>
              <span className="font-semibold">{NOME_DA_ACAO[a.tipo]}</span>
              <span className="truncate">{a.alvo}</span>
              <span className="text-cinza-texto">{a.motivo ?? "—"}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-cinza-texto">
        Somente leitura: nenhuma linha pode ser editada ou apagada. Mostra as 300 mais recentes; o CSV traz todas do filtro.
      </p>
    </div>
  );
}
