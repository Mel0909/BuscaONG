import Link from "next/link";

import { motivoDenunciaSchema } from "@/backend/schemas";
import { fichaOngAdmin } from "@/backend/services/admin";
import { contarFila, filaDeDenuncias, relatosDoGrupo, textoDoGrupo } from "@/backend/services/denuncias";
import type { StatusDenuncia } from "@prisma/client";
import { cn } from "@/lib/utils";
import { DENUNCIAS_PARA_TOPO, nomeDoMotivo } from "@/lib/denuncia/motivos";
import { ehObjectId } from "@/lib/ong/slug";
import { CabecalhoFicha, ContatosDaOng, SinaisDaOng } from "../_components/FichaOng";
import { ChipFiltro, dataCurta, estiloCabecalhoTabela, ListaEFicha, quandoFoi, Selo, TituloAdmin } from "../_components/ui";
import { carregarAdmin, parametro } from "../_utils/carregarAdmin";
import { AcoesDenuncia } from "./_components/AcoesDenuncia";

const ABAS: { valor: string; status: StatusDenuncia; nome: string }[] = [
  { valor: "abertas", status: "ABERTA", nome: "Abertas" },
  { valor: "arquivadas", status: "ARQUIVADA", nome: "Arquivadas" },
  { valor: "com-acao", status: "COM_ACAO", nome: "Com ação" },
];

const COLUNAS = "grid grid-cols-[1.4fr_1.2fr_90px_80px] items-center gap-2";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// A2: fila de denúncias, agrupadas por ONG e motivo, com a ficha e os relatos à direita
export default async function AdminDenunciasPage({ searchParams }: Props) {
  await carregarAdmin();
  const params = await searchParams;
  const aba = ABAS.find((a) => a.valor === parametro(params.aba)) ?? ABAS[0];
  const ongId = parametro(params.ong);
  const motivo = motivoDenunciaSchema.safeParse(parametro(params.motivo));
  const temSelecao = ehObjectId(ongId) && motivo.success;

  const [contagem, fila, ficha, relatos] = await Promise.all([
    contarFila(),
    filaDeDenuncias(aba.status),
    temSelecao ? fichaOngAdmin(ongId) : null,
    temSelecao ? relatosDoGrupo(ongId, motivo.data, aba.status) : [],
  ]);
  const grupo = temSelecao ? fila.find((g) => g.ongId === ongId && g.motivo === motivo.data) : undefined;

  const url = (extra: Record<string, string> = {}) =>
    `/admin/denuncias?${new URLSearchParams({ ...(aba.valor !== "abertas" ? { aba: aba.valor } : {}), ...extra })}`;

  const lista = (
    <>
      <div className="flex gap-2 overflow-x-auto">
        {ABAS.map((a) => (
          <ChipFiltro key={a.valor} href={a.valor === "abertas" ? "/admin/denuncias" : `/admin/denuncias?aba=${a.valor}`} ativo={a.valor === aba.valor}>
            {a.nome} {contagem[a.status]}
          </ChipFiltro>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-cinza-borda bg-branco">
        <div className="min-w-[560px]">
          <div className={cn(COLUNAS, estiloCabecalhoTabela)}>
            <span>ONG</span>
            <span>Motivo</span>
            <span>Denúncias</span>
            <span>Última</span>
          </div>
          {fila.length === 0 && (
            <p className="border-t border-cinza-linha px-4 py-6 text-sm text-cinza-texto">
              {aba.status === "ABERTA" ? "Nenhuma denúncia aberta." : "Nada por aqui."}
            </p>
          )}
          {fila.map((g) => {
            const ativa = g.ongId === ongId && g.motivo === (motivo.success ? motivo.data : null);
            return (
              <Link
                key={`${g.ongId}:${g.motivo}`}
                href={url({ ong: g.ongId, motivo: g.motivo })}
                aria-current={ativa ? "true" : undefined}
                className={cn(COLUNAS, "border-t border-cinza-linha px-4 py-[11px] text-[13px] font-medium hover:bg-cinza-fundo", ativa && "bg-cinza-cabecalho")}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold">{g.ongNome}</span>
                  {g.prioritaria && aba.status === "ABERTA" && <Selo tipo="alerta">Topo</Selo>}
                </span>
                <span className="truncate text-cinza-texto">{nomeDoMotivo(g.motivo)}</span>
                <span className="tabular-nums">{g.total}</span>
                <span className="text-cinza-texto">{quandoFoi(g.ultima)}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <p className="text-xs leading-normal text-cinza-texto">
        Denúncias da mesma ONG e do mesmo motivo são agrupadas. Com {DENUNCIAS_PARA_TOPO} ou mais em 7 dias, ou com violência, a ONG
        vai para o topo da fila. A denúncia não tira a ONG do ar sozinha.
      </p>
    </>
  );

  const painel =
    ficha && motivo.success ? (
      <>
        <CabecalhoFicha ficha={ficha}>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-cinza-texto">
            {textoDoGrupo(relatos.length, motivo.data)}
            {grupo?.prioritaria && aba.status === "ABERTA" && <Selo tipo="alerta">Revisar</Selo>}
          </span>
        </CabecalhoFicha>
        <ContatosDaOng ficha={ficha} />

        <TituloAdmin>Relatos</TituloAdmin>
        <ul className="flex flex-col gap-2">
          {relatos.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 rounded-[10px] bg-cinza-fundo px-3 py-2.5 text-[13px] leading-[1.45]">
              <span className={cn(!r.relato && "italic text-cinza-texto")}>{r.relato ?? "Sem relato"}</span>
              <span className="text-[11px] text-cinza-texto">{dataCurta(r.createdAt)} · anônimo</span>
              {r.resolucao && <span className="text-[11px] text-cinza-texto">Decisão: {r.resolucao}</span>}
            </li>
          ))}
        </ul>

        <SinaisDaOng sinais={ficha.sinais} />

        {aba.status === "ABERTA" && relatos.length > 0 && (
          <AcoesDenuncia key={`${ongId}:${motivo.data}`} ongId={ongId} motivo={motivo.data} ongSuspensa={ficha.status === "SUSPENSA"} />
        )}
        <Link href={`/admin/ongs?ong=${ongId}`} className="text-[13px] font-semibold text-musgo underline underline-offset-2">
          Abrir ficha da ONG
        </Link>
      </>
    ) : (
      <p className="text-[13px] leading-normal text-cinza-texto">
        Escolha uma linha para ver os relatos e decidir. A ONG não vê quem denunciou; o e-mail de quem denunciou também não
        aparece aqui (é usado só para avisar da decisão).
      </p>
    );

  return <ListaEFicha lista={lista} ficha={painel} />;
}
