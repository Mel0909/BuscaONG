# Erros a consertar

Problemas encontrados no código herdado do template, numa revisão feita em 2026-10-02. Os já corrigidos estão marcados com ✅ e continuam listados para manter a numeração.

- **Escopo da revisão:** back-end (`app/(backend)/`), utils de API, configuração do better-auth e telas de auth.
- **Fora do escopo:** componentes visuais (`components/ui`, `components/base`) e estilos.

Os comportamentos do better-auth citados abaixo foram conferidos no código da versão instalada (1.5.5).

**Contexto do BuscaONG:** não há conta de doador, só **ONG e Admin** têm login (ver [buscaong.md](buscaong.md)). As rotas `/api/users/*` vieram do template genérico e podem ser redesenhadas, ou removidas, quando as features de ONG e Admin forem implementadas. Mesmo assim, enquanto existirem, estão expostas.

**Legenda:**
- 🔴 segurança
- 🟠 funcionalidade quebrada
- 🟡 menor / qualidade
- ✅ corrigido

## Resumo

| # | Sev. | Problema | Arquivo |
|---|---|---|---|
| 1 | ✅ | ~~Qualquer pessoa, sem login, lê qualquer usuário pelo ID~~ | `api/users/[id]/route.ts` |
| 2 | ✅ | ~~Qualquer usuário logado lista todos os usuários~~ | `api/users/route.ts` |
| 3 | ✅ | ~~Política de senha só existe no front; a API do better-auth aceita senhas fracas~~ | `auth.ts`, `CadastroForm.tsx` |
| 4 | ✅ | ~~Chaves do Resend embutidas no bundle via `next.config.ts`~~ | `next.config.ts` |
| 5 | ✅ | ~~Validação de ID exige UUID, mas o better-auth gera IDs alfanuméricos~~ | `schemas/base.schema.ts` |
| 6 | 🟠 | Trocar e-mail e senha pela API sempre falha (chama o better-auth sem a sessão) | `api/users/[id]/email`, `.../password` |
| 7 | ✅ | ~~"Esqueci a senha" nunca funciona e não avisa~~ | `api/password/forgot/route.ts`, `auth.ts` |
| 8 | ✅ | ~~Botão "Entrar/Cadastro com Google" quebra (provedor desativado)~~ | `GoogleLoginButton.tsx`, `auth.ts` |
| 9 | ✅ | ~~`redirect()` dentro de `setTimeout` no cadastro~~ | `CadastroForm.tsx` |
| 10 | 🟡 | `validBody` devolve a resposta de erro como se fosse o corpo | `utils/api/server/validBody.ts` |
| 11 | ✅ | ~~Reset de senha sem validação da política~~ | `api/password/reset/route.ts` |
| 12 | 🟡 | Admin pode apagar ou editar outros admins | `api/users/[id]/route.ts` |
| 13 | ✅ | ~~Regras de senha inconsistentes entre telas e rotas~~ | vários |
| 14 | 🟡 | Validação de nome rejeita hífen e apóstrofo | `schemas/auth.schema.ts` |
| 15 | 🟡 | `getUserRole` devolve `[]` em vez de `undefined` | `services/auth/user.ts` |
| 16 | 🟡 | Build exibe erros de `BETTER_AUTH_SECRET` sem `.env` | ambiente |
| 17 | 🟡 | Aviso de "NFT list" no build (Prisma no trace do proxy) | `proxy.ts`, `services/db` |
| 18 | 🟡 | Falha intermitente ao baixar a fonte Bricolage no `next dev`/`next build` | `app/layout.tsx` |

## Detalhes

Caminhos relativos a `web/src/`.

### 1. ✅ Leitura de qualquer usuário sem login

> **Corrigido:** `GET`, `PATCH` e `DELETE /api/users/[id]` usam a mesma autorização: exigem sessão com perfil `ONG` ou `ADMIN`; ONG só acessa a própria conta e admin pode acessar outras. A sessão é lida dos headers da requisição, antes de qualquer acesso ao banco. O GET devolve 404 quando a conta não existe. Testes em `web/tests/integration/api/users/acesso.test.ts`. Corrigido junto com o #5; os tópicos abaixo descrevem o problema original.

- **Onde:** [api/users/[id]/route.ts:14](../web/src/app/(backend)/api/users/[id]/route.ts#L14)
- **Problema:** o `GET` não chama `blockForbiddenRequests`; não há nenhuma verificação de sessão.
- **Cenário:** `GET /api/users/<id>` sem cookie retorna nome, e-mail, role e datas do usuário. Hoje o erro #5 bloqueia isso por acidente (todo ID real é rejeitado), mas corrigir o #5 sozinho **abre o vazamento**.
- **Correção:** exigir sessão e permitir só o próprio usuário ou admins, como já é feito no `PATCH` e no `DELETE` do mesmo arquivo. **Corrigir junto com o #5.**

### 2. ✅ Qualquer usuário logado lista todos os usuários

> **Corrigido:** a listagem consulta a sessão diretamente e exige explicitamente `ADMIN`. Sem sessão responde 401; ONG ou sessão sem perfil responde 403, sem consultar usuários no banco.

- **Onde:** [api/users/route.ts:16](../web/src/app/(backend)/api/users/route.ts#L16)
- **Problema:** o `GET` passa `allowedRoles.POST` para a verificação, mas `allowedRoles` só define `GET`. Com `undefined`, o `blockForbiddenRequests` só confere se existe sessão e ignora o perfil.
- **Cenário:** um usuário comum logado chama `GET /api/users` e recebe a lista completa, com e-mails.
- **Correção:** trocar por `allowedRoles.GET`.

### 3. ✅ Política de senha só no front

> **Corrigido:** um hook `before` do better-auth (`lib/auth-hooks.ts`) aplica o `passwordSchema` em `/sign-up/email`, `/change-password`, `/reset-password` e `/email-otp/reset-password`, e bloqueia o cadastro direto pelo HTTP (`feat(auth): adiciona verificação de e-mail por código e regra de senha no servidor`).

- **Onde:** [CadastroForm.tsx:36-46](../web/src/app/(frontend)/(auth)/cadastro/_components/CadastroForm.tsx#L36-L46) e [auth.ts](../web/src/auth.ts)
- **Problema:** o cadastro chama `authClient.signUp.email` direto, que vai para `/api/auth/sign-up/email` (rota do better-auth). A política (maiúscula, minúscula, número) só é checada no navegador. O better-auth só exige 8 caracteres por padrão. O `POST /api/users`, que valida com `registerSchema`, não é usado pela tela.
- **Cenário:** uma requisição direta para `/api/auth/sign-up/email` com senha `aaaaaaaa` cria a conta. A regex de nome também é ignorada.
- **Correção:** validar no servidor com um hook `before` do better-auth (em `/sign-up/email`, `/reset-password` e `/change-password`), reutilizando `passwordSchema`. Ou fazer a tela usar `POST /api/users`.

### 4. ✅ Segredos do Resend no bundle

> **Corrigido:** o bloco `env` foi removido do `next.config.ts` (`fix(web): remove segredos do bloco env do next.config`).

- **Onde:** [next.config.ts](../web/next.config.ts) (bloco `env`)
- **Problema:** o `env` do `next.config` **embute o valor no JavaScript em tempo de build**, onde quer que `process.env.RESEND_API_KEY` apareça. Hoje só o servidor referencia essa variável (em código comentado), mas basta um componente client usar a variável para a chave vazar para o navegador.
- **Correção:** remover o bloco `env`. O código de servidor já lê `process.env` em runtime, e variáveis públicas devem usar o prefixo `NEXT_PUBLIC_`.

### 5. ✅ Validação de ID incompatível com os IDs do better-auth

> **Corrigido:** `idSchema` aceita exatamente 32 caracteres alfanuméricos, mantendo o formato já gerado pelo better-auth e as contas existentes. Não foi alterado o gerador de IDs nem feita migração. O schema é exclusivo das contas; não deve ser reutilizado para os ObjectIds de ONG. A validação foi corrigida junto com a autorização do #1. As rotas de e-mail e senha continuam com os problemas do #6.

- **Onde:** [schemas/base.schema.ts:3](../web/src/app/(backend)/schemas/base.schema.ts#L3)
- **Problema:** `idSchema = z.string().uuid()`. O better-auth gera IDs de **32 caracteres alfanuméricos**, não UUIDs, a menos que `advanced.database.generateId: "uuid"` esteja configurado, e o [auth.ts](../web/src/auth.ts) não configura.
- **Cenário:** `GET`, `PATCH` e `DELETE` em `/api/users/[id]`, além de `/email` e `/password`, sempre respondem **400 "ID inválido"** para qualquer usuário real.
- **Correção:** escolher uma das duas:
  - (a) Configurar `generateId: "uuid"` no better-auth. Só vale para usuários novos.
  - (b) Trocar o `idSchema` por um formato compatível (ex.: `z.string().regex(/^[A-Za-z0-9]{32}$/)` ou só `.min(1)`).

  A opção (b) foi adotada junto com o #1. Os modelos de ONG usam ObjectId, com validação separada quando necessária.

### 6. 🟠 Trocar e-mail e senha pela API sempre falha

- **Onde:**
  - [api/users/[id]/email/route.ts:38](../web/src/app/(backend)/api/users/[id]/email/route.ts#L38)
  - [api/users/[id]/password/route.ts:38](../web/src/app/(backend)/api/users/[id]/password/route.ts#L38)
- **Problema:** `auth.api.changeEmail` e `auth.api.changePassword` são chamados **sem `headers`**. No better-auth essas rotas usam `sensitiveSessionMiddleware` e exigem a sessão.
- **Outros pontos:**
  - O `[id]` da URL é validado mas **ignorado**: a troca sempre se aplicaria ao usuário da sessão.
  - A senha atual também é validada com a política nova (`currentPassword: passwordSchema`), o que bloqueia quem tem senha antiga fora da regra.
- **Cenário:** qualquer chamada responde 500 "Erro Interno do Servidor".
- **Correção:**
  - Passar `headers: await headers()`.
  - Remover o `[id]` da rota (ex.: `/api/me/email`) ou exigir que ele seja o da sessão.
  - Validar `currentPassword` só com `z.string().min(1)`.

### 7. ✅ "Esqueci a senha" nunca funciona e não avisa

> **Corrigido:** recuperação pública por código de seis dígitos em `/login/recuperar`, com as rotas `password/forgot` e `password/reset` reescritas sobre o better-auth. Resposta de solicitação neutra, limites por IP/e-mail, validação de senha, revogação de sessões e testes com os endpoints reais do better-auth usando banco em memória. Não depende de `sendResetPassword` nem de tokens em URL. Os itens abaixo registram o fluxo antigo.

- **Onde:** [api/password/forgot/route.ts](../web/src/app/(backend)/api/password/forgot/route.ts) e [auth.ts](../web/src/auth.ts) (`sendResetPassword` comentado)
- **Problemas, em ordem:**
  1. A rota **exige login** (`blockForbiddenRequests` com roles), mas quem esqueceu a senha não está logado.
  2. Sem `sendResetPassword` configurado, o better-auth lança "Reset password isn't enabled". O `catch` engole o erro e responde `{ ok: true }`: **falha silenciosa**.
  3. O `redirectTo` aponta para `/api/password/reset`, que é um endpoint `POST`. O link do e-mail abre um `GET`, que dá 405. Precisa apontar para uma **página** que peça a nova senha.
  4. Se `BETTER_AUTH_URL` não estiver definido, o link vira `undefined/api/password/reset`.
- **Correção:**
  - Tirar a exigência de login.
  - Configurar o `sendResetPassword` (Resend ou Brevo).
  - Criar a página de redefinição e apontar o `redirectTo` para ela.
  - Registrar o erro em log no `catch`, mantendo a resposta neutra.

### 8. ✅ Botão do Google quebrado

> **Corrigido:** o botão saiu da tela de login, que foi refeita (e os componentes `components/auth/*` foram removidos). Login com Google segue em aberto como decisão de produto ([buscaong.md §9](buscaong.md)).

- **Onde:** [GoogleLoginButton.tsx](../web/src/components/auth/GoogleLoginButton.tsx), usado em `/login`
- **Problema:** `socialProviders.google` está comentado no [auth.ts](../web/src/auth.ts), então clicar no botão retorna erro do provedor.
- **Correção:** decidir se o login com Google entra para ONG e Admin. Se não, remover os botões; se sim, configurar `GOOGLE_ID` e `GOOGLE_SECRET` e descomentar.

### 9. ✅ `redirect()` em `setTimeout` no cadastro

> **Corrigido:** a página `/cadastro` (e o `CadastroForm`) foi removida junto com o cadastro genérico (`feat(auth)!: remove o cadastro genérico de usuários`).

- **Onde:** [CadastroForm.tsx:57-59](../web/src/app/(frontend)/(auth)/cadastro/_components/CadastroForm.tsx#L57-L59)
- **Problema:** o `redirect()` do `next/navigation` não funciona em event handlers nem callbacks de Client Components; ele lança um erro interno em vez de navegar.
- **Correção:** usar `useRouter().push('/')`.

### 10. 🟡 `validBody` devolve o erro como se fosse o corpo

- **Onde:** [utils/api/server/validBody.ts](../web/src/utils/api/server/validBody.ts)
- **Problema:** com JSON malformado, a função **retorna** um `NextResponse` em vez de lançar. Quem chama trata o retorno como corpo; por exemplo, `const { newEmail } = await validBody(...)` resulta em `undefined`. A mensagem "JSON malformado" nunca chega ao cliente; ele recebe um erro de validação genérico. Os `catch` das rotas já esperam um `NextResponse` lançado (`error instanceof NextResponse`).
- **Correção:** trocar `return` por `throw` no `catch` do `validBody`.

### 11. ✅ Reset de senha sem validação

> **Corrigido:** `recuperarSenhaSchema` valida e-mail, código e `passwordSchema` antes do service; o hook também exige a política nos endpoints nativos. Testes cobrem senhas fracas, código expirado/reutilizado, preservação do cadastro e revogação das sessões.

- **Onde:** [api/password/reset/route.ts](../web/src/app/(backend)/api/password/reset/route.ts)
- **Problema:** `newPassword` vai direto para o better-auth, sem `passwordSchema` e sem `validBody`.
- **Correção:** validar com `passwordSchema` (ou resolver junto com o hook do #3).

### 12. 🟡 Sem hierarquia entre admins

- **Onde:** [api/users/[id]/route.ts:38](../web/src/app/(backend)/api/users/[id]/route.ts#L38)
- **Problema:** `ADMIN` pode apagar ou editar outros admins.
- **Correção:** é decisão de produto; definir junto com a feature de Admin.

### 13. ✅ Regras de senha inconsistentes

> **Corrigido:** as telas de login não validam mais o tamanho da senha (só conferem com o better-auth), e toda senha nova (cadastro, esqueci a senha, admin) segue o `passwordSchema`, que o hook `before` aplica no servidor.

| Lugar | Regra |
|---|---|
| Tela de login ([LoginForm.tsx:72](../web/src/app/(frontend)/(auth)/login/_components/LoginForm.tsx#L72)) | ≥ 6 caracteres |
| `loginSchema` | ≥ 8 |
| Cadastro e `passwordSchema` | ≥ 8 + maiúscula + minúscula + número |
| better-auth (padrão) | ≥ 8 |

- **Correção:** uma única fonte, o `passwordSchema`, mais a configuração de `minPasswordLength` do better-auth.

### 14. 🟡 Nome rejeita hífen e apóstrofo

- **Onde:** [schemas/auth.schema.ts:14](../web/src/app/(backend)/schemas/auth.schema.ts#L14)
- **Problema:** a regex `/^[a-zA-ZÀ-ÿ\s]+$/` rejeita "Ana-Clara" e "D'Ávila", e o intervalo `À-ÿ` aceita `×` e `÷`.
- **Correção:** usar `\p{L}` com flag `u` e permitir `'` e `-`. Os nomes de ONG terão regra própria (com números, `&` etc.).

### 15. 🟡 `getUserRole` com retorno inconsistente

- **Onde:** [services/auth/user.ts:4](../web/src/app/(backend)/services/auth/user.ts#L4)
- **Problema:** devolve `[]` quando não há `userId` e `Role | undefined` nos outros casos. O `role` da sessão pode virar um array.
- **Correção:** retornar `undefined`.

### 16. 🟡 Erros de `BETTER_AUTH_SECRET` no build

- **Onde:** ambiente (`web/.env` inexistente)
- **Problema:** sem `.env`, o `next build` imprime `BetterAuthError: You are using the default secret` várias vezes. O build conclui, mas em produção sem a variável o app usaria o segredo padrão.
- **Correção:** documentar no setup (o README já manda criar o `.env`) e garantir a variável na Vercel. Opcional: falhar o build de produção se ela faltar.

### 17. 🟡 Aviso de "NFT list" no build

- **Onde:** `next build` (Turbopack), trace a partir do `proxy.ts`
- **Problema:** o build avisa "Encountered unexpected file in NFT list". O cliente Prisma gerado em `src/generated/prisma`, que faz operações de sistema de arquivos, entra no trace do `proxy.ts` via `auth.ts` → `services/db`. O build conclui, mas o trace pode incluir arquivos demais.
- **Correção:** avaliar ao reescrever o `proxy.ts`. Por exemplo, checar só o cookie de sessão no proxy, sem importar o Prisma, e validar a sessão nas páginas e rotas. Outra opção é mudar o `output` do gerador do Prisma.

### 18. 🟡 Falha intermitente ao baixar a fonte Bricolage

- **Onde:** `app/layout.tsx` (`next/font/google`), no `next dev` e no `next build` com Turbopack
- **Problema:** de vez em quando o Turbopack falha ao baixar os arquivos da Bricolage Grotesque e mostra `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'`. No dev, a página responde 500; no build, ele falha. Aconteceu 2 vezes em muitas execuções (2026-10-31), sempre só com a Bricolage; a Figtree e a IBM Plex Mono nunca falharam. Rodar de novo resolve.
- **Correção:** hospedar as fontes no próprio projeto com `next/font/local` (arquivos `.woff2` versionados; as três fontes têm licença OFL). Isso tira a dependência de rede do build. Alternativa: pedir a Bricolage como fonte variável, sem listar pesos, para reduzir o número de arquivos baixados.

## Correção adicional: reinício indevido de rascunho

O POST público de ONG não aceita mais substituir cadastro existente. O reinício agora exige sessão da própria ONG, confirmação explícita e código enviado ao e-mail já vinculado. Somente dados do rascunho são limpos; a conta é mantida. Escritas condicionais a dono, status e `updatedAt` impedem limpar ONG publicada ou publicar/restaurar dados anteriores ao reinício. Foi habilitado `emailOTP.disableSignUp` para impedir contas sem ONG por um caminho alternativo. Detalhes em [autenticacao.md §5.1](autenticacao.md).
