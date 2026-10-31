'use client'
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { MAX_HORARIOS } from "@/lib/cadastro/limites";
import { ATIVIDADE_OUTRA, DIAS_VOLUNTARIADO } from "@/lib/cadastro/voluntariado";
import {
  CabecalhoPasso,
  ErroCampo,
  estiloAreaTexto,
  estiloRotulo,
  estiloTituloSecao,
  FormularioPasso,
  Interruptor,
  MensagemErro,
  Opcional,
  RodapePasso,
} from "./ui";
import { useEnvioPasso } from "./useEnvioPasso";

type Opcao = { slug: string; nome: string };

export type HorarioForm = {
  dia: string;
  inicio: number | null; // null = horário livre
  fim: number | null;
  atividade: string;
  atividadeOutra: string;
};

type Props = {
  atividades: Opcao[];
  inicial: { aceitaVoluntarios: boolean; horarios: HorarioForm[]; requisitos: string };
};

const HORAS_INICIO = Array.from({ length: 18 }, (_, i) => i + 5); // 5h a 22h
const estiloSelect =
  "h-[42px] w-full min-w-0 cursor-pointer rounded-[10px] border border-borda bg-papel px-2 text-[15px] font-medium outline-none focus:border-2 focus:border-musgo";
const COLUNAS = "md:grid-cols-[170px_220px_1fr_40px]";

export function PassoVoluntariado({ atividades, inicial }: Props) {
  const { enviando, erro, campos, enviar } = useEnvioPasso("voluntariado", "/ong/cadastro/apresentacao");
  const [aceita, setAceita] = useState(inicial.aceitaVoluntarios);
  const proximoId = useRef(inicial.horarios.length);
  const [horarios, setHorarios] = useState(() => inicial.horarios.map((h, id) => ({ ...h, id })));
  const [requisitos, setRequisitos] = useState(inicial.requisitos);

  function mudar(id: number, parte: Partial<HorarioForm>) {
    setHorarios((atual) => atual.map((h) => (h.id === id ? { ...h, ...parte } : h)));
  }

  function adicionar() {
    setHorarios((atual) => [
      ...atual,
      {
        id: proximoId.current++,
        dia: "SABADO",
        inicio: 8,
        fim: 12,
        atividade: atividades[0]?.slug ?? ATIVIDADE_OUTRA,
        atividadeOutra: "",
      },
    ]);
  }

  function mudarInicio(id: number, valor: string, fimAtual: number | null) {
    if (valor === "") return mudar(id, { inicio: null, fim: null });
    const inicio = Number(valor);
    mudar(id, { inicio, fim: fimAtual !== null && fimAtual > inicio ? fimAtual : Math.min(inicio + 4, 24) });
  }

  function salvar() {
    void enviar({
      aceitaVoluntarios: aceita,
      horarios: horarios.map((h) => ({
        dia: h.dia,
        inicio: h.inicio,
        fim: h.fim,
        atividade: h.atividade,
        atividadeOutra: h.atividade === ATIVIDADE_OUTRA ? h.atividadeOutra : null,
      })),
      requisitos,
    });
  }

  return (
    <FormularioPasso aoEnviar={salvar}>
      <CabecalhoPasso titulo="Quando vocês recebem voluntários">
        Opcional. Cada horário aparece no filtro de voluntariado e na página da ONG. O contato é feito pelo WhatsApp ou
        e-mail informados.
      </CabecalhoPasso>

      <div className="flex max-w-[900px] flex-col gap-[18px]">
        <Interruptor
          ligado={aceita}
          aoMudar={(ligado) => {
            setAceita(ligado);
            if (ligado && horarios.length === 0) adicionar();
          }}
          titulo="Aceitamos voluntários"
          descricao="Desligado, os horários somem do perfil e dos filtros"
          className="max-w-[560px] px-[18px]"
        />

        <fieldset disabled={!aceita} className={cn("flex flex-col gap-[18px]", !aceita && "opacity-50")}>
          <legend className="sr-only">Horários</legend>
          {horarios.length > 0 && (
            <div className={cn("hidden gap-3 px-[15px] md:grid", COLUNAS, estiloTituloSecao)} aria-hidden="true">
              <span>Dia</span>
              <span>Horário</span>
              <span>Atividade</span>
              <span />
            </div>
          )}

          <ul className="flex flex-col gap-2">
            {horarios.map((h, indice) => {
              const erroLinha = Object.entries(campos).find(([campo]) => campo.startsWith(`horarios.${indice}.`))?.[1];
              return (
                <li
                  key={h.id}
                  className="flex flex-col gap-2 rounded-[14px] border border-borda-suave bg-papel px-[14px] py-[10px]"
                >
                  <div className={cn("grid grid-cols-2 items-center gap-3", COLUNAS)}>
                    <select
                      aria-label="Dia"
                      value={h.dia}
                      onChange={(e) => mudar(h.id, { dia: e.target.value })}
                      className={estiloSelect}
                    >
                      {DIAS_VOLUNTARIADO.map((d) => (
                        <option key={d.valor} value={d.valor}>
                          {d.nome}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Início"
                        value={h.inicio ?? ""}
                        onChange={(e) => mudarInicio(h.id, e.target.value, h.fim)}
                        className={estiloSelect}
                      >
                        <option value="">Horário livre</option>
                        {HORAS_INICIO.map((hora) => (
                          <option key={hora} value={hora}>
                            {hora}h
                          </option>
                        ))}
                      </select>
                      {h.inicio !== null && (
                        <>
                          <span className="text-tinta-suave">–</span>
                          <select
                            aria-label="Fim"
                            value={h.fim ?? ""}
                            onChange={(e) => mudar(h.id, { fim: Number(e.target.value) })}
                            className={estiloSelect}
                          >
                            {Array.from({ length: 24 - h.inicio }, (_, i) => h.inicio! + i + 1).map((hora) => (
                              <option key={hora} value={hora}>
                                {hora}h
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>

                    <select
                      aria-label="Atividade"
                      value={h.atividade}
                      onChange={(e) => mudar(h.id, { atividade: e.target.value })}
                      className={estiloSelect}
                    >
                      {atividades.map((a) => (
                        <option key={a.slug} value={a.slug}>
                          {a.nome}
                        </option>
                      ))}
                      <option value={ATIVIDADE_OUTRA}>Outra…</option>
                    </select>

                    <button
                      type="button"
                      aria-label="Remover horário"
                      onClick={() => setHorarios(horarios.filter((x) => x.id !== h.id))}
                      className="cursor-pointer text-center text-lg text-tinta-suave hover:text-tinta"
                    >
                      ×
                    </button>
                  </div>

                  {h.atividade === ATIVIDADE_OUTRA && (
                    <input
                      aria-label="Qual atividade?"
                      placeholder="Qual atividade?"
                      maxLength={60}
                      value={h.atividadeOutra}
                      onChange={(e) => mudar(h.id, { atividadeOutra: e.target.value })}
                      className="h-[42px] rounded-[10px] border border-borda bg-papel px-3 text-[15px] outline-none focus:border-2 focus:border-musgo"
                    />
                  )}
                  <ErroCampo id={`erro-horario-${h.id}`}>{erroLinha}</ErroCampo>
                </li>
              );
            })}
          </ul>

          {horarios.length < MAX_HORARIOS && (
            <button
              type="button"
              onClick={adicionar}
              className="cursor-pointer self-start text-sm font-semibold text-musgo"
            >
              + Adicionar horário
            </button>
          )}
          <ErroCampo id="erro-horarios">{campos.horarios}</ErroCampo>

          <div className="flex max-w-[560px] flex-col gap-[7px]">
            <label htmlFor="requisitos" className={estiloRotulo}>
              Requisitos
              <Opcional />
            </label>
            <textarea
              id="requisitos"
              rows={2}
              maxLength={500}
              value={requisitos}
              onChange={(e) => setRequisitos(e.target.value)}
              placeholder="Ex: maiores de 18 anos. Primeira visita com agendamento."
              className={estiloAreaTexto}
            />
            <ErroCampo id="erro-requisitos">{campos.requisitos}</ErroCampo>
          </div>
        </fieldset>

        <MensagemErro>{erro}</MensagemErro>
      </div>

      <RodapePasso voltar="/ong/cadastro/causas-itens" enviando={enviando} />
    </FormularioPasso>
  );
}
