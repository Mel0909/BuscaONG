import { contarListas, opcoesComUso, sugestoesItensLivres } from "@/backend/services/admin";
import { ChipFiltro, TituloAdmin } from "../_components/ui";
import { carregarAdmin, parametro } from "../_utils/carregarAdmin";
import { SugestoesItensLivres } from "./_components/SugestoesItensLivres";
import { TabelaLista } from "./_components/TabelaLista";

const LISTAS = [
  { valor: "itens", tipo: "ITEM", nome: "Itens", singular: "Item" },
  { valor: "causas", tipo: "CAUSA", nome: "Causas", singular: "Causa" },
  { valor: "atividades", tipo: "ATIVIDADE", nome: "Atividades", singular: "Atividade" },
] as const;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// A4: listas de causas, itens e atividades, e as sugestões vindas do texto livre das ONGs
export default async function AdminListasPage({ searchParams }: Props) {
  await carregarAdmin();
  const params = await searchParams;
  const lista = LISTAS.find((l) => l.valor === parametro(params.lista)) ?? LISTAS[0];

  const [contagem, opcoes, sugestoes] = await Promise.all([
    contarListas(),
    opcoesComUso(lista.tipo),
    lista.tipo === "ITEM" ? sugestoesItensLivres() : null,
  ]);

  return (
    <div className="grid flex-1 lg:grid-cols-[1fr_400px]">
      <div className="flex min-w-0 flex-col gap-3.5 px-4 py-5 md:px-6">
        <div className="flex gap-2 overflow-x-auto">
          {LISTAS.map((l) => (
            <ChipFiltro key={l.valor} href={`/admin/listas?lista=${l.valor}`} ativo={l.valor === lista.valor}>
              {l.nome} {contagem[l.tipo]}
            </ChipFiltro>
          ))}
        </div>
        <TabelaLista key={lista.tipo} tipo={lista.tipo} opcoes={opcoes} nomeSingular={lista.singular} />
        <p className="text-xs leading-normal text-cinza-texto">
          Arrastar (ou usar as setas) define a ordem nos filtros e no cadastro. Itens em uso não podem ser excluídos, só
          unificados com outro.
        </p>
      </div>

      <aside className="flex flex-col gap-3 border-t border-cinza-borda bg-branco px-5 py-[18px] lg:border-l lg:border-t-0">
        {sugestoes ? (
          <>
            <div className="flex flex-col gap-1">
              <TituloAdmin>Sugestões do texto livre</TituloAdmin>
              <span className="text-xs leading-normal text-cinza-texto">
                Itens que as ONGs escreveram à mão, dos mais usados para os menos.
              </span>
            </div>
            <SugestoesItensLivres sugestoes={sugestoes} />
            <p className="text-xs leading-normal text-cinza-texto">
              Ao adicionar ou unificar, as ONGs que usavam o texto livre passam para o item da lista, e o filtro do mapa
              passa a encontrá-las.
            </p>
          </>
        ) : (
          <p className="text-[13px] leading-normal text-cinza-texto">
            Causas e atividades seguem o mesmo padrão dos itens: renomear não mexe nas ONGs, e o que está em uso só se
            unifica com outra opção.
          </p>
        )}
      </aside>
    </div>
  );
}
