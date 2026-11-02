'use client'
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import { CampoCodigo } from "@/components/base/campos/CampoCodigo";
import { CampoSenha } from "@/components/base/campos/CampoSenha";
import { CabecalhoPasso, estiloBotaoPrimario, estiloCampo, estiloRotulo, FormularioPasso, MensagemErro } from "./ui";

const ESPERA_REENVIO_MS = 60_000;
const TAMANHO_CODIGO = 6;

/**
 * Continuar um cadastro começado e não publicado: entra com o e-mail e a senha do passo 2 e
 * segue para o passo em que parou. Se o e-mail ainda não foi confirmado (a pessoa saiu antes
 * de digitar o código), manda um código novo e confirma aqui mesmo.
 */
export function PassoContinuar({ reiniciar = false }: { reiniciar?: boolean }) {
  const destino = reiniciar ? "/ong/cadastro/reiniciar" : "/ong/cadastro/retomar";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false); // senha certa, falta confirmar o e-mail
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<ReactNode>(null);
  const [reenviarEm, setReenviarEm] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());

  // relógio da contagem do "Reenviar em 0:42"
  useEffect(() => {
    if (reenviarEm <= agora) return;
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [reenviarEm, agora]);

  const segundosParaReenviar = Math.max(0, Math.ceil((reenviarEm - agora) / 1000));

  async function enviarCodigo() {
    setReenviarEm(Date.now() + ESPERA_REENVIO_MS);
    setAgora(Date.now());
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    if (error) setErro("Não foi possível enviar o código agora. Tente de novo em instantes.");
  }

  async function entrar() {
    setEnviando(true);
    setErro(null);
    const { error } = await authClient.signIn.email({ email, password: senha });

    if (!error) {
      router.push(destino);
      return; // mantém "Aguarde…" até a próxima tela abrir
    }
    setEnviando(false);

    // o better-auth só diz que falta confirmar o e-mail depois de conferir a senha
    if (error.code === "EMAIL_NOT_VERIFIED") {
      setConfirmando(true);
      await enviarCodigo();
    } else if (error.status === 401) {
      setErro("E-mail ou senha incorretos.");
    } else {
      setErro("Não foi possível entrar agora. Tente de novo em instantes.");
    }
  }

  async function confirmarCodigo() {
    setEnviando(true);
    setErro(null);
    // com autoSignInAfterVerification, confirmar o código já abre a sessão
    const { error } = await authClient.emailOtp.verifyEmail({ email, otp: codigo });
    if (!error) {
      router.push(destino);
      return;
    }
    setEnviando(false);
    setCodigo("");
    setErro("Código incorreto ou expirado. Confira o e-mail ou peça um novo código.");
  }

  const podeEnviar = confirmando ? codigo.length === TAMANHO_CODIGO : !!email && !!senha;

  return (
    <FormularioPasso aoEnviar={() => (podeEnviar && !enviando ? (confirmando ? confirmarCodigo() : entrar()) : undefined)}>
      <CabecalhoPasso titulo="Continue o cadastro da ONG">
        {reiniciar ? "Entre na conta da ONG. Depois, confirme o e-mail para recomeçar com segurança." : "Entre com o e-mail e a senha que vocês criaram no cadastro. Seguimos do passo em que pararam."}
      </CabecalhoPasso>

      <div className="flex max-w-[520px] flex-col gap-[22px]">
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="email" className={estiloRotulo}>
            E-mail de acesso
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={confirmando}
            onChange={(e) => setEmail(e.target.value)}
            className={estiloCampo}
          />
        </div>

        {!confirmando && (
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="senha" className={estiloRotulo}>
              Senha
            </label>
            <CampoSenha
              id="senha"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        )}

        {confirmando && (
          <div className="flex flex-col gap-3 rounded-[18px] border border-borda-suave bg-papel px-5 py-[18px]">
            <span className="text-[15px] font-semibold">
              Falta confirmar o e-mail. Digite o código enviado para {email}
            </span>
            <CampoCodigo tamanho={TAMANHO_CODIGO} valor={codigo} aoMudar={setCodigo} desabilitado={enviando} />
            <span className="text-[13px] text-tinta-suave">
              Não chegou?{" "}
              {segundosParaReenviar > 0 ? (
                <span className="font-semibold text-musgo">
                  Reenviar em {Math.floor(segundosParaReenviar / 60)}:
                  {String(segundosParaReenviar % 60).padStart(2, "0")}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={enviarCodigo}
                  className="cursor-pointer font-semibold text-musgo underline underline-offset-2"
                >
                  Reenviar código
                </button>
              )}
            </span>
          </div>
        )}

        <MensagemErro>{erro}</MensagemErro>

        <p className="text-sm leading-normal text-tinta-suave">
          Não lembra a senha?{" "}
          <Link href="/login/recuperar" className="font-semibold text-musgo underline underline-offset-2">
            Recupere o acesso pelo e-mail
          </Link>
          . Seus dados do cadastro serão mantidos.
        </p>
      </div>

      <div className="mt-auto flex items-center justify-end gap-3 border-t border-borda-suave pt-[18px]">
        <button type="submit" disabled={enviando || !podeEnviar} className={estiloBotaoPrimario}>
          {enviando ? "Aguarde…" : confirmando ? "Confirmar e continuar" : "Continuar cadastro"}
        </button>
      </div>
    </FormularioPasso>
  );
}
