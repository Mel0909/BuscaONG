'use client'
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { useCadastro } from "./CadastroContext";
import { CampoCodigo } from "./CampoCodigo";
import { CampoSenha } from "./CampoSenha";

// mesma regra que o servidor aplica (passwordSchema)
const REGRAS_SENHA = [
  { texto: "8 caracteres ou mais", ok: (s: string) => s.length >= 8 },
  { texto: "uma letra maiúscula", ok: (s: string) => /[A-Z]/.test(s) },
  { texto: "uma letra minúscula", ok: (s: string) => /[a-z]/.test(s) },
  { texto: "um número", ok: (s: string) => /\d/.test(s) },
];

const ESPERA_REENVIO_MS = 60_000;
const TAMANHO_CODIGO = 6;

type Erro = { mensagem: ReactNode; campo?: "email" | "password" };

const estiloCampo =
  "h-[52px] w-full rounded-[14px] border border-borda bg-papel px-4 text-base outline-none focus:border-2 focus:border-musgo disabled:opacity-60";
const estiloBotaoPrimario =
  "h-[50px] cursor-pointer rounded-[15px] bg-musgo px-7 text-base font-semibold text-papel transition-colors hover:bg-musgo-escuro disabled:cursor-not-allowed disabled:opacity-60";
const estiloBotaoSecundario =
  "flex h-[50px] items-center rounded-[15px] bg-salvia-clara px-[22px] text-[15px] font-semibold text-musgo transition-colors hover:bg-salvia";

function MensagemErro({ erro }: { erro: Erro | null }) {
  if (!erro) return null;
  return (
    <div role="alert" className="rounded-[14px] border border-borda bg-papel px-4 py-3 text-[15px] leading-normal">
      {erro.mensagem}
    </div>
  );
}

export function PassoAcesso() {
  const router = useRouter();
  const { dados, carregado, salvar } = useCadastro();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<Erro | null>(null);
  const [reenviarEm, setReenviarEm] = useState(0);
  const [agora, setAgora] = useState(() => Date.now());
  // depois de confirmar o código os dados são limpos; não deve voltar para o passo 1
  const concluido = useRef(false);

  // sem o CNPJ validado no passo 1, volta para ele
  useEffect(() => {
    if (carregado && !dados && !concluido.current) router.replace("/ong/cadastro");
  }, [carregado, dados, router]);

  // relógio da contagem do "Reenviar em 0:42"
  useEffect(() => {
    if (reenviarEm <= agora) return;
    const timer = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [reenviarEm, agora]);

  if (!dados) return null;

  const emailPendente = dados.emailPendente;
  const segundosParaReenviar = Math.max(0, Math.ceil((reenviarEm - agora) / 1000));

  async function criarAcesso(e: FormEvent) {
    e.preventDefault();
    if (!dados || enviando) return;
    setErro(null);
    setEnviando(true);

    try {
      const response = await fetch("/api/ongs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cnpj: dados.cnpj,
          email,
          password: senha,
          usarEnderecoReceita: dados.usarEnderecoReceita,
        }),
      });
      const body = await response.json().catch(() => null);

      if (response.status === 201) {
        salvar({ ...dados, emailPendente: body.email });
        setReenviarEm(Date.now() + ESPERA_REENVIO_MS);
        setAgora(Date.now());
        return;
      }

      const mensagem: string = body?.error?.message ?? "Não foi possível criar o acesso. Tente de novo.";
      const campo = body?.error?.details?.campo;
      if (response.status === 409 && campo === "cnpj") {
        setErro({
          mensagem: (
            <>
              {mensagem}{" "}
              <Link href="/login" className="font-semibold text-musgo underline underline-offset-2">
                Entrar
              </Link>
            </>
          ),
        });
      } else {
        setErro({ mensagem, campo: campo === "email" ? "email" : undefined });
      }
    } catch {
      setErro({ mensagem: "Sem conexão. Confira a internet e tente de novo." });
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarCodigo(e: FormEvent) {
    e.preventDefault();
    if (!emailPendente || enviando || codigo.length < TAMANHO_CODIGO) return;
    setErro(null);
    setEnviando(true);

    const { error } = await authClient.emailOtp.verifyEmail({ email: emailPendente, otp: codigo });
    setEnviando(false);

    if (error) {
      setCodigo("");
      setErro({ mensagem: "Código incorreto ou expirado. Confira o e-mail ou peça um novo código." });
      return;
    }

    // e-mail confirmado e sessão criada: o rascunho segue no servidor a partir daqui
    concluido.current = true;
    salvar(null);
    router.push("/ong/cadastro/localizacao");
  }

  async function reenviarCodigo() {
    if (!emailPendente || segundosParaReenviar > 0) return;
    setErro(null);
    setReenviarEm(Date.now() + ESPERA_REENVIO_MS);
    setAgora(Date.now());

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: emailPendente,
      type: "email-verification",
    });
    if (error) setErro({ mensagem: "Não foi possível reenviar o código agora. Tente de novo em instantes." });
  }

  const senhaValida = REGRAS_SENHA.every((r) => r.ok(senha));
  // só avisa depois que a pessoa começou a digitar a confirmação
  const senhasDiferentes = confirmacao.length > 0 && confirmacao !== senha;

  return (
    <form
      onSubmit={emailPendente ? confirmarCodigo : criarAcesso}
      className="flex min-h-[calc(100vh-7rem)] flex-col gap-6 md:min-h-[calc(100vh-7rem)]"
    >
      <div className="flex max-w-[820px] flex-col gap-2">
        <h1 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[34px]">
          Crie o acesso da ONG
        </h1>
        <p className="text-pretty text-base leading-normal text-tinta-suave">
          Com o acesso criado, o cadastro fica salvo e vocês podem continuar depois. Estes dados são internos.
        </p>
      </div>

      <div className="flex max-w-[520px] flex-col gap-[22px]">
        <div className="flex flex-col gap-[7px]">
          <label htmlFor="email" className="text-sm font-semibold">
            E-mail de acesso
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={emailPendente ?? email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!emailPendente}
            aria-invalid={erro?.campo === "email"}
            className={cn(estiloCampo, erro?.campo === "email" && "border-2 border-tinta")}
          />
          <span className="text-[13px] text-tinta-suave">
            Para entrar no painel e receber avisos do site. Não aparece no perfil.
          </span>
        </div>

        {!emailPendente && (
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="senha" className="text-sm font-semibold">
              Senha
            </label>
            <CampoSenha
              id="senha"
              autoComplete="new-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              aria-describedby="regras-senha"
            />
            <ul id="regras-senha" className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              {REGRAS_SENHA.map((regra) => {
                const ok = regra.ok(senha);
                return (
                  <li key={regra.texto} className={ok ? "font-semibold text-musgo" : "text-tinta-suave"}>
                    {ok ? "✓" : "·"} {regra.texto}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {!emailPendente && (
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="confirmacao-senha" className="text-sm font-semibold">
              Confirme a senha
            </label>
            <CampoSenha
              id="confirmacao-senha"
              autoComplete="new-password"
              required
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              invalido={senhasDiferentes}
              aria-describedby={senhasDiferentes ? "erro-confirmacao" : undefined}
            />
            {senhasDiferentes && (
              <span id="erro-confirmacao" className="text-[13px] font-semibold text-tinta">
                As senhas não são iguais.
              </span>
            )}
          </div>
        )}

        {emailPendente && (
          <div className="flex flex-col gap-3 rounded-[18px] border border-borda-suave bg-papel px-5 py-[18px]">
            <span className="text-[15px] font-semibold">Digite o código enviado para {emailPendente}</span>
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
                  onClick={reenviarCodigo}
                  className="cursor-pointer font-semibold text-musgo underline underline-offset-2"
                >
                  Reenviar código
                </button>
              )}
            </span>
          </div>
        )}

        <MensagemErro erro={erro} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-borda-suave pt-[18px]">
        {emailPendente ? (
          <span />
        ) : (
          <Link href="/ong/cadastro" className={estiloBotaoSecundario}>
            Voltar
          </Link>
        )}
        <button
          type="submit"
          disabled={enviando || (emailPendente ? codigo.length < TAMANHO_CODIGO : !senhaValida || !email || confirmacao !== senha)}
          className={estiloBotaoPrimario}
        >
          {enviando ? "Aguarde…" : emailPendente ? "Confirmar e continuar" : "Criar acesso"}
        </button>
      </div>
    </form>
  );
}
