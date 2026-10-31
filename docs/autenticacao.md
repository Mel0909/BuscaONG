# Autenticação (better-auth)

Como a autenticação funciona no BuscaONG e as regras para mexer nela. Documentação oficial: https://www.better-auth.com/docs

## 1. Quem tem conta

Só **ONG** (`/ong`) e **Admin** (`/admin`). Visitantes e doadores usam o site sem login (ver [buscaong.md §2](buscaong.md)).

> Perfis no enum `Role` do `schema.prisma`: `ONG` (padrão) e `ADMIN`.

## 2. Onde está cada peça

| Peça | Arquivo |
|---|---|
| Configuração do servidor | `web/src/auth.ts` |
| Hook que roda antes das rotas do better-auth | `web/src/lib/auth-hooks.ts` |
| E-mail do código de verificação | `web/src/lib/email/templates/codigoVerificacao.ts` |
| Criação de conta (ONG) | `POST /api/ongs` → `services/ongs` (`criarContaOng`) |
| Endpoints do better-auth (`/api/auth/*`) | `web/src/app/(backend)/api/auth/[...all]/route.ts` |
| Cliente para o navegador | `web/src/lib/auth-client.ts` |
| Proteção de páginas | `web/src/proxy.ts` (`ROUTE_CONFIG`) |
| Proteção de rotas da API | `blockForbiddenRequests` ([padroes-api.md §5](padroes-api.md)) |
| Tabelas | modelos `User`, `Session`, `Account`, `Verification` no `schema.prisma` |

Configuração atual do `auth.ts`:
- Adapter Prisma com MongoDB.
- Login por e-mail e senha, com **e-mail verificado obrigatório** (`requireEmailVerification`).
- **Verificação por código** (plugin `emailOTP` com `overrideDefaultEmailVerification`): 6 dígitos, válido por 10 minutos, guardado com hash e enviado pelo Resend. Na criação da conta o código é enviado automaticamente (`sendOnSignUp`), e confirmar o código já cria a sessão (`autoSignInAfterVerification`).
- **Hook `before`** (`lib/auth-hooks.ts`):
  - aplica a regra de senha (8+, maiúscula, minúscula e número) em cadastro, troca e redefinição de senha;
  - **bloqueia o cadastro direto** em `/api/auth/sign-up/email` vindo do HTTP. Só o servidor cria contas (`auth.api.signUpEmail`, sem `request`), pelo `POST /api/ongs`, junto com a ONG.
- Exclusão e troca de e-mail habilitadas.
- O plugin `customSession` acrescenta o `role` do usuário à sessão.
- O plugin `nextCookies` cuida dos cookies em Server Actions.

## 3. Regras

1. **Operações de conta passam pelo better-auth**, nunca pelo Prisma direto: cadastro, login, logout, troca de senha, troca de e-mail, reset de senha. Ele cuida de hash, verificação de e-mail e invalidação de sessão.
2. **Nunca alterar senha ou e-mail via `update` comum.** O schema de atualização de usuário (`patchSchema`) bloqueia esses campos de propósito; use as funções dedicadas (`auth.api.changePassword`, `auth.api.changeEmail`).
3. **Ninguém troca a senha ou o e-mail de outra pessoa**, nem admin. Se o admin precisar agir sobre contas (bloquear, remover), avaliar o [plugin admin do better-auth](https://www.better-auth.com/docs/plugins/admin) em vez de escrever no banco.
4. **Exceção conhecida:** a exclusão de usuário pelo admin hoje apaga `Session`, `Account` e `User` direto via Prisma (`services/users`). Ao reescrever, preferir o fluxo do better-auth ou do plugin admin.
5. **Funções de servidor precisam da sessão:** chamadas como `auth.api.getSession`, `changePassword` e `changeEmail` exigem `headers: await headers()`. Sem isso, falham (bug #6 em [erros-a-consertar.md](erros-a-consertar.md)).
6. **Não editar os modelos do better-auth no `schema.prisma`** sem conferir a documentação; campos novos de usuário entram como `additionalFields` na configuração.
7. **Contas só nascem pelo `POST /api/ongs`.** Não reabra o cadastro direto do better-auth: uma conta de perfil ONG sem `Ong` ligada fica num estado inválido.
8. **E-mail repetido não dá erro no `signUpEmail`:** com a verificação obrigatória, o better-auth devolve um usuário falso para não revelar quais e-mails existem. Quem cria conta precisa checar o e-mail antes, como `criarContaOng` faz.

## 4. Como usar

**No servidor** (Server Component, rota, proxy):

```ts
import { auth } from "@/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
// session?.user, session?.role
```

**No navegador** (Client Component):

```ts
import { authClient } from "@/lib/auth-client";

await authClient.signIn.email({ email, password, callbackURL: "/" });
await authClient.signOut();
```

## 5. Reset de senha

O fluxo esperado:
1. A pessoa informa o e-mail.
2. O better-auth gera um token e chama `sendResetPassword`, que envia um e-mail com o link (via Resend ou Brevo).
3. O link abre uma **página** do site que pede a nova senha.
4. A página envia o token e a nova senha ao better-auth.

**Hoje esse fluxo não funciona:** `sendResetPassword` está desativado, a rota exige login e o link aponta para um endpoint, não para uma página. Detalhes no bug #7 de [erros-a-consertar.md](erros-a-consertar.md).

## 6. Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `BETTER_AUTH_SECRET` | assina sessões e tokens; obrigatória em produção (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | URL base do site; usada nos links de e-mail |
| `GOOGLE_ID`, `GOOGLE_SECRET` | só se o login com Google for ativado (bug #8) |
