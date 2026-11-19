'use client'
import { useState } from "react";

import { cn } from "@/lib/utils";
import { INTERVALO_DENUNCIA_MS, MAX_RELATO, MOTIVOS_DENUNCIA } from "@/lib/denuncia/motivos";
import type { MotivoDenuncia } from "@prisma/client";
import { Flag } from "lucide-react";
import { Dialogo } from "@/components/base/Dialogo";

type Props = { ongId: string; ongNome: string };

// guarda no aparelho quando a pessoa denunciou cada perfil (1 por perfil a cada 24 h)
const chave = (ongId: string) => `buscaong:denuncia:${ongId}`;

function denunciouHaPouco(ongId: string) {
  try {
    const quando = Number(localStorage.getItem(chave(ongId)));
    return Number.isFinite(quando) && Date.now() - quando < INTERVALO_DENUNCIA_MS;
  } catch {
    return false;
  }
}

const estiloCampo =
  "w-full rounded-[13px] border border-borda bg-papel px-[14px] text-[15px] outline-none focus:border-2 focus:border-musgo";

/** "Denunciar" discreto sobre a foto (P5) e o formulário curto (P5.1), que cai na fila do admin. */
export function DenunciarPerfil({ ongId, ongNome }: Props) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [relato, setRelato] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviada, setEnviada] = useState<MotivoDenuncia | null>(null);
  const [repetida, setRepetida] = useState(false);

  function abrir() {
    setRepetida(denunciouHaPouco(ongId));
    setAberto(true);
  }

  function fechar() {
    setAberto(false);
    setErro(null);
    if (enviada) {
      setEnviada(null);
      setMotivo(null);
      setRelato("");
      setEmail("");
    }
  }

  async function enviar() {
    if (!motivo) {
      setErro("Escolha o que aconteceu.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/denuncias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ongId, motivo, relato, email }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) {
        setErro(corpo?.error?.message ?? "Não foi possível enviar. Tente de novo.");
        return;
      }
      try {
        localStorage.setItem(chave(ongId), String(Date.now()));
      } catch {}
      setEnviada(motivo);
    } catch {
      setErro("Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="absolute right-4 top-4 z-10 flex h-10 cursor-pointer items-center gap-1.5 rounded-[13px] bg-papel/90 px-3 text-[13px] font-medium text-tinta-suave hover:bg-papel hover:text-tinta"
      >
        <Flag className="size-3.5" aria-hidden="true" />
        Denunciar
      </button>

      {aberto && enviada && (
        <Dialogo titulo="Denúncia enviada" aoFechar={fechar}>
          <span className="flex size-14 items-center justify-center self-center rounded-full bg-salvia text-2xl font-bold text-musgo" aria-hidden="true">
            ✓
          </span>
          <p className="text-[15px] leading-normal text-tinta-suave">
            Obrigado por avisar. A equipe vai analisar o perfil de {ongNome}. Se você deixou e-mail, avisamos quando houver
            uma decisão.
          </p>
          {enviada === "VIOLENCIA" && (
            <div className="flex flex-col gap-1 rounded-[14px] bg-salvia-clara px-4 py-3 text-sm leading-normal text-musgo-escuro">
              <span className="font-semibold">Se alguém está em perigo agora, ligue:</span>
              <span>
                <a href="tel:190" className="font-semibold underline">190</a> · Polícia Militar
              </span>
              <span>
                <a href="tel:100" className="font-semibold underline">Disque 100</a> · Direitos Humanos (crianças, idosos,
                pessoas com deficiência)
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={fechar}
            className="h-[52px] cursor-pointer rounded-[15px] bg-musgo text-[15px] font-semibold text-papel hover:bg-musgo-escuro"
          >
            Voltar ao perfil
          </button>
        </Dialogo>
      )}

      {aberto && !enviada && (
        <Dialogo titulo="Denunciar perfil" subtitulo={ongNome} aoFechar={fechar}>
          {repetida ? (
            <>
              <p className="text-[15px] leading-normal text-tinta-suave">
                Você já denunciou este perfil nas últimas 24 horas. A equipe vai analisar; não precisa enviar de novo.
              </p>
              <button
                type="button"
                onClick={fechar}
                className="h-[52px] cursor-pointer rounded-[15px] bg-salvia-clara text-[15px] font-semibold text-musgo hover:bg-salvia"
              >
                Voltar ao perfil
              </button>
            </>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                enviar();
              }}
              className="flex flex-col gap-5"
            >
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-semibold">O que aconteceu?</legend>
                {MOTIVOS_DENUNCIA.map((m) => (
                  <label
                    key={m.valor}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-[13px] border px-[14px] py-3 text-[15px]",
                      motivo === m.valor ? "border-2 border-musgo bg-salvia-clara font-semibold" : "border-borda bg-papel"
                    )}
                  >
                    <input
                      type="radio"
                      name="motivo"
                      value={m.valor}
                      checked={motivo === m.valor}
                      onChange={() => setMotivo(m.valor)}
                      className="size-[18px] accent-musgo"
                    />
                    {m.texto}
                  </label>
                ))}
              </fieldset>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">
                  Conte o que viu <span className="font-normal text-tinta-suave">(opcional)</span>
                </span>
                <textarea
                  value={relato}
                  onChange={(e) => setRelato(e.target.value)}
                  maxLength={MAX_RELATO}
                  rows={3}
                  className={cn(estiloCampo, "py-3 leading-normal")}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold">
                  Seu e-mail <span className="font-normal text-tinta-suave">(opcional, para retorno)</span>
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className={cn(estiloCampo, "h-[50px]")}
                />
              </label>

              <p className="text-[13px] text-tinta-suave">A ONG não fica sabendo quem denunciou.</p>

              {erro && (
                <p role="alert" className="rounded-[13px] border border-borda px-4 py-3 text-sm font-semibold">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="h-[52px] cursor-pointer rounded-[15px] bg-musgo text-[15px] font-semibold text-papel hover:bg-musgo-escuro disabled:opacity-60"
              >
                {enviando ? "Enviando…" : "Enviar denúncia"}
              </button>
            </form>
          )}
        </Dialogo>
      )}
    </>
  );
}
