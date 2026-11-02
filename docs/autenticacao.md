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
- `emailOTP.disableSignUp: true`: códigos nunca criam usuários sem ONG.
- Códigos limitados a três tentativas e dez minutos, com hash. O hook compartilha limites por e-mail entre as rotas próprias e os aliases do better-auth (3 envios ou 10 confirmações por minuto); APIs próprias também limitam IP/conta. São limites em memória, por instância, não um limite global distribuído.
- Redefinir a senha revoga as sessões anteriores (`revokeSessionsOnPasswordReset`).
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

O fluxo usa **código por e-mail**, reutilizando o plugin `emailOTP`:
1. `/recuperar-acesso` envia o e-mail a `POST /api/password/forgot`, sem exigir sessão.
2. Rota → schema → `services/auth/recuperacao.ts` → `auth.api.requestPasswordResetEmailOTP`. O e-mail é normalizado; a resposta `{ ok: true }` é igual para conta existente, inexistente e falha do provedor. Falhas são registradas sem código, e-mail ou detalhes sensíveis.
3. A pessoa digita código, nova senha e confirmação. `POST /api/password/reset` valida e-mail, seis dígitos e política de senha; o service chama `auth.api.resetPasswordEmailOTP`.
4. O better-auth valida o código, troca a credencial, confirma o e-mail caso ainda não estivesse confirmado e revoga sessões. A pessoa faz login com a nova senha; o rascunho permanece intacto.

Não são usados tokens em URL nem o fluxo por link (`sendResetPassword` permanece desativado). Códigos inválidos, expirados e já utilizados têm mensagem neutra. Os endpoints HTTP nativos continuam sob a mesma política de senha e limite por e-mail do hook; `disableSignUp` impede criar conta pelo login com OTP.

## 5.1 Reinício do rascunho

As rotas `/api/ongs/minha/reinicio` e `/codigo` exigem sessão ONG, origem do site e agem exclusivamente sobre a conta da sessão. O envio usa o e-mail da sessão e tipo `sign-in`. A confirmação usa `auth.api.signInEmailOTP`, que valida/consome o código e renova a sessão; o token não é retornado no JSON. A identidade comprovada precisa coincidir com a original. A limpeza condicional só altera `Ong`, preservando `User`, credenciais e dados de CNPJ. Ver [buscaong.md §4.1](buscaong.md).

## 6. Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `BETTER_AUTH_SECRET` | assina sessões e tokens; obrigatória em produção (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | URL base do site; usada nos links de e-mail |
| `GOOGLE_ID`, `GOOGLE_SECRET` | só se o login com Google for ativado (bug #8) |

## 7. Consumo de códigos sob concorrência

A versão instalada do better-auth (1.5.5) faz a leitura e a exclusão do OTP em operações separadas. Uma tentativa errada concorrente podia recriar um código consumido; duas redefinições simultâneas podiam usar o mesmo código. A regressão foi reproduzida nos testes antes da proteção.

`lib/auth-consumo-otp.ts` complementa o hook `before` nas rotas de login por código, verificação e redefinição por OTP. No contexto exclusivo de cada chamada, a primeira leitura reivindica a verificação com `adapter.updateMany`, comparando ID, valor anterior e validade. Só a chamada com contagem 1 prossegue. O código consumido permanece marcado até expirar; uma tentativa errada atualiza a contagem no mesmo registro, sem recriar uma geração antiga. Usa o adapter do próprio better-auth, sem escrever credenciais por Prisma nem alterar a dependência instalada.

A proteção exige armazenamento das verificações no banco. Configurar `secondaryStorage` bloqueia esses fluxos até implementar consumo condicional equivalente nesse armazenamento. Testes usam os endpoints reais e concorrência; o adapter em memória de teste tem seu retorno `updateMany` normalizado para o contrato de contagem que o Prisma implementa. Não foi necessário alterar modelos ou migrar dados.
