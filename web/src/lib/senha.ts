// Regra de senha do BuscaONG, uma só para as telas e para o servidor:
// - nas telas (cadastro, recuperação), REQUISITOS_SENHA vira a lista que se marca enquanto a pessoa digita;
// - no servidor, o passwordSchema (schemas/base.schema.ts) aplica os mesmos requisitos, e o hook do
//   better-auth (lib/auth-hooks.ts) o usa em toda rota que grava senha.

export const SENHA_MINIMO = 8;
/** Limite do better-auth (maxPasswordLength); acima disso o hash fica caro sem ganho. */
export const SENHA_MAXIMO = 128;

export type RequisitoSenha = {
  /** como aparece na lista da tela */
  texto: string;
  /** erro devolvido pela API quando falta */
  mensagem: string;
  atende: (senha: string) => boolean;
};

// \p{Lu} e \p{Ll}: letras com acento também contam (É é maiúscula, ç é minúscula)
export const REQUISITOS_SENHA: readonly RequisitoSenha[] = [
  {
    texto: `${SENHA_MINIMO} caracteres ou mais`,
    mensagem: `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres`,
    atende: (senha) => senha.length >= SENHA_MINIMO,
  },
  { texto: "Uma letra maiúscula", mensagem: "A senha precisa de uma letra maiúscula", atende: (senha) => /\p{Lu}/u.test(senha) },
  { texto: "Uma letra minúscula", mensagem: "A senha precisa de uma letra minúscula", atende: (senha) => /\p{Ll}/u.test(senha) },
  { texto: "Um número", mensagem: "A senha precisa de um número", atende: (senha) => /\d/.test(senha) },
];

/** A senha cumpre todos os requisitos (o máximo é conferido só no servidor). */
export const senhaAtendeRequisitos = (senha: string) => REQUISITOS_SENHA.every((r) => r.atende(senha));
