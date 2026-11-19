'use client'
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import { REQUISITOS_SENHA, senhaAtendeRequisitos } from "@/lib/senha";
import { CampoCodigo } from "@/components/base/campos/CampoCodigo";
import { CampoSenha } from "@/components/base/campos/CampoSenha";

const TAMANHO_CODIGO = 6;
const ESPERA_REENVIO_MS = 60_000;

const estiloCampo =
  "h-[52px] w-full rounded-[14px] border border-borda bg-papel px-4 text-base outline-none focus:border-2 focus:border-musgo disabled:opacity-60";
const estiloBotao =
  "h-[52px] cursor-pointer rounded-[15px] bg-musgo text-base font-semibold text-papel transition-colors hover:bg-musgo-escuro disabled:cursor-not-allowed disabled:opacity-60";

/** POST /api/password/forgot ou /reset; não lança em erro de rede (vira status 0). */
async function enviar(rota: "forgot" | "reset", corpo: Record<string, string>) {
  try {
    const resposta = await fetch(`/api/password/${rota}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    return { ok: resposta.ok, status: resposta.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/**
 * "Esqueci a senha": o servidor pede ao better-auth um código de 6 dígitos por e-mail (plugin
 * emailOTP); com o código, a pessoa escolhe a senha nova e já entra.
 * Por segurança, a tela não diz se o e-mail tem conta: o código só chega se tiver.
 */
export function RecuperarSenha() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ReactNode>(null);
  const [reenviarEm, setReenviarEm] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (reenviarEm <= agora) return;
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [reenviarEm, agora]);
  const segundos = Math.max(0, Math.ceil((reenviarEm - agora) / 1000));

  async function pedirCodigo() {
    setEnviando(true);
    setErro(null);
    const resposta = await enviar("forgot", { email: email.trim().toLowerCase() });
    setEnviando(false);
    if (!resposta.ok) {
      setErro(resposta.status === 429 ? "Muitas tentativas. Espere um pouco." : "Não foi possível enviar o código agora. Tente de novo.");
      return;
    }
    setReenviarEm(Date.now() + ESPERA_REENVIO_MS);
    setAgora(Date.now());
    setEtapa("codigo");
  }

  const senhaValida = senhaAtendeRequisitos(senha);
  const podeSalvar = codigo.length === TAMANHO_CODIGO && senhaValida && senha === confirmacao;

  async function redefinir() {
    if (!podeSalvar) {
      if (senha !== confirmacao) setErro("As senhas não conferem.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const emailNormalizado = email.trim().toLowerCase();
    const resposta = await enviar("reset", { email: emailNormalizado, codigo, newPassword: senha });
    if (!resposta.ok) {
      setEnviando(false);
      setCodigo("");
      setErro(
        resposta.status === 429
          ? "Muitas tentativas. Espere um pouco."
          : resposta.status === 400
            ? "Código incorreto, expirado ou já usado. Confira o e-mail ou peça um novo código."
            : "Não foi possível trocar a senha agora. Tente de novo."
      );
      return;
    }

    // senha trocada (as sessões antigas foram encerradas): entra direto com a nova
    const login = await authClient.signIn.email({ email: emailNormalizado, password: senha });
    if (!login.error) {
      router.push("/ong/painel");
      return;
    }
    setEnviando(false);
    setErro(
      <>
        Senha trocada.{" "}
        <Link href={login.error.code === "EMAIL_NOT_VERIFIED" ? "/ong/cadastro/continuar" : "/login"} className="font-semibold text-musgo underline">
          {login.error.code === "EMAIL_NOT_VERIFIED" ? "Continue o cadastro" : "Entre com a senha nova"}
        </Link>
        .
      </>
    );
  }

  if (etapa === "email") {
    return (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (email && !enviando) pedirCodigo();
        }}
        className="flex flex-col gap-5"
      >
        <label className="flex flex-col gap-[7px]">
          <span className="text-sm font-semibold">E-mail de acesso</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={estiloCampo} />
        </label>
        {erro && (
          <p role="alert" className="rounded-[14px] border border-borda bg-papel px-4 py-3 text-[15px]">
            {erro}
          </p>
        )}
        <button type="submit" disabled={enviando || !email} className={estiloBotao}>
          {enviando ? "Enviando…" : "Enviar código"}
        </button>
        <Link href="/login" className="text-sm font-semibold text-musgo underline underline-offset-2">
          Voltar para o login
        </Link>
      </form>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!enviando) redefinir();
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-3 rounded-[18px] border border-borda-suave bg-papel px-5 py-[18px]">
        <span className="text-[15px] font-semibold">Se {email} tem conta, enviamos um código para ele.</span>
        <CampoCodigo tamanho={TAMANHO_CODIGO} valor={codigo} aoMudar={setCodigo} desabilitado={enviando} />
        <span className="text-[13px] text-tinta-suave">
          Não chegou? Confira o spam.{" "}
          {segundos > 0 ? (
            <span className="font-semibold text-musgo">
              Reenviar em {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, "0")}
            </span>
          ) : (
            <button type="button" onClick={pedirCodigo} className="cursor-pointer font-semibold text-musgo underline underline-offset-2">
              Reenviar código
            </button>
          )}
        </span>
      </div>

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="nova-senha" className="text-sm font-semibold">
          Senha nova
        </label>
        <CampoSenha id="nova-senha" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
          {REQUISITOS_SENHA.map((r) => (
            <li key={r.texto} className={r.atende(senha) ? "font-semibold text-musgo" : "text-tinta-suave"}>
              {r.atende(senha) ? "✓" : "○"} {r.texto}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-[7px]">
        <label htmlFor="confirmacao" className="text-sm font-semibold">
          Repita a senha nova
        </label>
        <CampoSenha
          id="confirmacao"
          autoComplete="new-password"
          value={confirmacao}
          invalido={!!confirmacao && confirmacao !== senha}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        {confirmacao && confirmacao !== senha && <span className="text-[13px] font-semibold">As senhas não conferem.</span>}
      </div>

      {erro && (
        <p role="alert" className="rounded-[14px] border border-borda bg-papel px-4 py-3 text-[15px] leading-normal">
          {erro}
        </p>
      )}

      <button type="submit" disabled={enviando || !podeSalvar} className={estiloBotao}>
        {enviando ? "Salvando…" : "Salvar senha e entrar"}
      </button>
      <button
        type="button"
        onClick={() => {
          setEtapa("email");
          setCodigo("");
          setErro(null);
        }}
        className="cursor-pointer self-start text-sm font-semibold text-musgo underline underline-offset-2"
      >
        Usar outro e-mail
      </button>
    </form>
  );
}
