'use client'
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CampoCodigo } from "@/frontend/ong/cadastro/_components/CampoCodigo";
import { CampoSenha } from "@/frontend/ong/cadastro/_components/CampoSenha";

const campo = "h-[52px] w-full rounded-[14px] border border-borda bg-papel px-4 outline-none focus:border-musgo";
const botao = "h-[50px] rounded-[15px] bg-musgo px-6 font-semibold text-papel hover:bg-musgo-escuro disabled:opacity-60";

export function RecuperarAcesso() {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [etapa, setEtapa] = useState<"email" | "codigo" | "concluido">("email");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (enviando) return;
    setErro("");
    if (etapa === "codigo" && senha !== confirmacao) return setErro("As senhas não são iguais.");
    setEnviando(true);
    try {
      const response = await fetch(`/api/password/${etapa === "email" ? "forgot" : "reset"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(etapa === "email" ? { email } : { email, codigo, newPassword: senha }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setErro(body?.error?.message ?? "Não foi possível continuar. Tente novamente.");
        return;
      }
      setEtapa(etapa === "email" ? "codigo" : "concluido");
      setSenha("");
      setConfirmacao("");
      setCodigo("");
    } catch {
      setErro("Sem conexão. Confira a internet e tente novamente.");
    } finally { setEnviando(false); }
  }

  if (etapa === "concluido") return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-semibold">Senha redefinida</h1>
      <p>Entre com a nova senha. As sessões anteriores foram encerradas.</p>
      <Link href="/ong/cadastro/continuar" className="font-semibold text-musgo underline">Continuar cadastro da ONG</Link>
      <Link href="/login" className="font-semibold text-musgo underline">Ir para o login</Link>
    </div>
  );

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-semibold">Recupere seu acesso</h1>
      <p className="text-tinta-suave">{etapa === "email" ? "Informe o e-mail usado para criar a conta da ONG." : "Se houver uma conta com esse e-mail, enviaremos um código de seis números. Ele vale por dez minutos."}</p>
      <label className="flex flex-col gap-2 font-semibold">
        E-mail de acesso
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} readOnly={etapa === "codigo"} className={campo} />
      </label>
      {etapa === "codigo" && <>
        <div className="flex flex-col gap-2">
          <span className="font-semibold">Código recebido por e-mail</span>
          <CampoCodigo tamanho={6} valor={codigo} aoMudar={setCodigo} desabilitado={enviando} />
        </div>
        <label htmlFor="nova-senha" className="font-semibold">Nova senha</label>
        <CampoSenha id="nova-senha" autoComplete="new-password" required minLength={8} maxLength={128} value={senha} onChange={(e) => setSenha(e.target.value)} />
        <p className="text-sm text-tinta-suave">Use pelo menos 8 caracteres, com maiúscula, minúscula e número.</p>
        <label htmlFor="confirmar-senha" className="font-semibold">Confirme a nova senha</label>
        <CampoSenha id="confirmar-senha" autoComplete="new-password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
      </>}
      {erro && <p role="alert" className="rounded-xl border border-tinta p-3">{erro}</p>}
      <button type="submit" disabled={enviando || (etapa === "codigo" && codigo.length !== 6)} className={botao}>
        {enviando ? "Aguarde…" : etapa === "email" ? "Enviar código" : "Redefinir senha"}
      </button>
      {etapa === "codigo" && <button type="button" disabled={enviando} onClick={() => { setEtapa("email"); setCodigo(""); setErro(""); }} className="text-musgo underline">Solicitar outro código ou corrigir e-mail</button>}
      <Link href="/ong/cadastro/continuar" className="text-musgo underline">Voltar para o acesso</Link>
    </form>
  );
}
