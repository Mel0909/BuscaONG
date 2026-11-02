'use client'
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CampoCodigo } from "@/components/base/campos/CampoCodigo";
import { useCadastro } from "./CadastroContext";
import { CabecalhoPasso, estiloBotaoPrimario, FormularioPasso, MensagemErro } from "./ui";

export function ReiniciarCadastro({ email }: { email: string }) {
  const router = useRouter();
  const { salvar } = useCadastro();
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar() {
    if (enviando || (enviado && (!confirmar || codigo.length !== 6))) return;
    setEnviando(true);
    setErro("");
    try {
      const response = await fetch(`/api/ongs/minha/reinicio${enviado ? "" : "/codigo"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enviado ? { codigo, confirmar } : {}),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) return setErro(body?.error?.message ?? "Não foi possível reiniciar agora. Tente novamente.");
      if (!enviado) { setEnviado(true); return; }
      salvar(null);
      router.push("/ong/cadastro/localizacao");
      router.refresh();
    } catch { setErro("Sem conexão. Confira a internet e tente novamente."); }
    finally { setEnviando(false); }
  }

  return <FormularioPasso aoEnviar={enviar}>
    <CabecalhoPasso titulo="Recomeçar o cadastro">
      Sua conta, seu e-mail e sua senha serão mantidos. Os dados preenchidos nos passos de localização até apresentação serão apagados.
    </CabecalhoPasso>
    <div className="flex max-w-[520px] flex-col gap-5">
      <p>Para confirmar, enviaremos um código para <strong>{email}</strong>. Ele vale por dez minutos e só pode ser usado uma vez.</p>
      {enviado && <>
        <CampoCodigo tamanho={6} valor={codigo} aoMudar={setCodigo} desabilitado={enviando} />
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={confirmar} onChange={(e) => setConfirmar(e.target.checked)} className="mt-1 accent-musgo" />
          Entendo que os dados do rascunho serão apagados e quero recomeçar.
        </label>
        <button type="button" disabled={enviando} onClick={() => { setEnviado(false); setCodigo(""); setConfirmar(false); }} className="text-left font-semibold text-musgo underline">Solicitar outro código</button>
      </>}
      <MensagemErro>{erro}</MensagemErro>
      <Link href="/ong/cadastro/retomar" className="font-semibold text-musgo underline">Manter meus dados e continuar</Link>
      <button type="submit" disabled={enviando || (enviado && (!confirmar || codigo.length !== 6))} className={estiloBotaoPrimario}>
        {enviando ? "Aguarde…" : enviado ? "Confirmar e recomeçar" : "Enviar código de confirmação"}
      </button>
    </div>
  </FormularioPasso>;
}
