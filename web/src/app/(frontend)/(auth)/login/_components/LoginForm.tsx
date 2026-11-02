'use client'
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import { CampoSenha } from "@/components/base/campos/CampoSenha";

const estiloCampo =
  "h-[52px] w-full rounded-[14px] border border-borda bg-papel px-4 text-base outline-none focus:border-2 focus:border-musgo";
const estiloLink = "font-semibold text-musgo underline underline-offset-2";

/** Login da ONG: e-mail e senha. Quem entra vai para o painel (ou para o cadastro, se não terminou). */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ReactNode>(null);

  async function entrar() {
    if (!email || !senha || enviando) return;
    setEnviando(true);
    setErro(null);

    const { error } = await authClient.signIn.email({ email, password: senha });
    if (!error) {
      // o painel leva o admin ao /admin e o cadastro não terminado ao passo em que parou
      router.push("/ong/painel");
      return; // mantém "Entrando…" até a próxima tela abrir
    }

    setEnviando(false);
    if (error.code === "EMAIL_NOT_VERIFIED") {
      setErro(
        <>
          Falta confirmar o e-mail desta conta.{" "}
          <Link href="/ong/cadastro/continuar" className={estiloLink}>
            Continue o cadastro
          </Link>{" "}
          para receber um código novo.
        </>
      );
    } else if (error.status === 401) {
      setErro("E-mail ou senha incorretos.");
    } else if (error.status === 429) {
      setErro("Muitas tentativas. Espere um pouco e tente de novo.");
    } else {
      setErro("Não foi possível entrar agora. Tente de novo em instantes.");
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        entrar();
      }}
      className="flex flex-col gap-5"
    >
      <label className="flex flex-col gap-[7px]">
        <span className="text-sm font-semibold">E-mail de acesso</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={estiloCampo}
        />
      </label>

      <div className="flex flex-col gap-[7px]">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="senha" className="text-sm font-semibold">
            Senha
          </label>
          <Link href="/login/recuperar" className="text-[13px] font-semibold text-musgo underline underline-offset-2">
            Esqueci a senha
          </Link>
        </div>
        <CampoSenha id="senha" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>

      {erro && (
        <p role="alert" className="rounded-[14px] border border-borda bg-papel px-4 py-3 text-[15px] leading-normal">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || !email || !senha}
        className="h-[52px] cursor-pointer rounded-[15px] bg-musgo text-base font-semibold text-papel transition-colors hover:bg-musgo-escuro disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>

      <div className="flex flex-col gap-2 border-t border-borda-suave pt-5 text-sm leading-normal text-tinta-suave">
        <span>
          Sua ONG ainda não tem conta?{" "}
          <Link href="/ong/cadastro" className={estiloLink}>
            Cadastre a ONG
          </Link>
        </span>
        <span>
          Começou o cadastro e não terminou?{" "}
          <Link href="/ong/cadastro/continuar" className={estiloLink}>
            Continue de onde parou
          </Link>
        </span>
      </div>
    </form>
  );
}
