'use client'
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { CampoSenha } from "@/components/base/campos/CampoSenha";

const estiloCampo =
  "h-11 w-full rounded-[10px] border border-cinza-borda bg-branco px-3 text-[15px] outline-none focus:border-2 focus:border-grafite";

/** Login do admin. Conta que não é de admin sai na hora (o painel da ONG fica em /login). */
export function LoginAdmin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    if (!email || !senha || enviando) return;
    setEnviando(true);
    setErro(null);

    const { error } = await authClient.signIn.email({ email, password: senha });
    if (error) {
      setEnviando(false);
      setErro(error.status === 401 ? "E-mail ou senha incorretos." : "Não foi possível entrar agora. Tente de novo.");
      return;
    }

    const { data } = await authClient.getSession();
    if (data?.role !== "ADMIN") {
      await authClient.signOut();
      setEnviando(false);
      setErro("Esta conta não é de admin. ONGs entram pelo painel da ONG, em /login.");
      return;
    }
    router.push("/admin/ongs");
    router.refresh();
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        entrar();
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
        E-mail
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={estiloCampo} />
      </label>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha-admin" className="text-[13px] font-semibold">
          Senha
        </label>
        <CampoSenha
          id="senha-admin"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="h-11 rounded-[10px] border-cinza-borda bg-branco text-[15px] focus:border-grafite"
        />
      </div>
      {erro && (
        <p role="alert" className="rounded-[10px] border border-cinza-borda bg-branco px-3 py-2.5 text-sm">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando || !email || !senha}
        className="h-11 cursor-pointer rounded-[10px] bg-grafite text-[15px] font-semibold text-branco hover:bg-grafite-ativo disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
