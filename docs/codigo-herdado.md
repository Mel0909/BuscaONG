# Código herdado do template

Inventário do que ainda veio do template "monorepo base" (de onde saiu o projeto noctiluz), levantado em 2026-10-02.

**Decisão:** o código abaixo foi mantido no começo e reescrito aos poucos, com a meta de não sobrar nada da seção 2 até o lançamento do BuscaONG.

**Situação em 2026-11-19:** todos os itens da seção 2 foram reescritos ou removidos (PRs #19 a #28). O arquivo fica como registro do que veio do template e do que entrou no lugar.

> Isto é um inventário técnico, não um parecer jurídico. O template não tinha arquivo LICENSE, o que por padrão significa "todos os direitos reservados" aos autores. A propriedade de software feito por membros de empresa júnior depende do estatuto e dos termos de voluntariado da organização.

O repositório não tem commits feitos antes da limpeza, então nada removido ficou no histórico do git.

## 1. Já removido: identidade do noctiluz


## 2. A reescrever: autoria do template

Caminhos de código relativos a `web/src/`. Ao reescrever, **não copiar o código antigo**: partir do requisito do BuscaONG e da documentação oficial das bibliotecas. Marque `[x]` quando o item for substituído ou removido.

### Back-end (~500 linhas)

- [x] `app/(backend)/api/users/**` (listagem, conta por ID, troca de e-mail e senha): removidas, sem uso nas telas
- [x] `app/(backend)/api/password/forgot`, `reset`: reescritas para recuperação por código via better-auth, com validação, limites e testes
- [x] `app/(backend)/schemas/base.schema.ts`: reescrito; a regra de senha saiu para `lib/senha.ts`, fonte única das telas e do servidor (`auth.schema.ts`, `nameSchema` e `corSchema` foram removidos)
- [x] `app/(backend)/services/auth/*`: `getUserRole` saiu com o `customSession`; `services/users/*` e o `comparePassword` com bcrypt também foram removidos. Fica só `recuperacao.ts`, escrito para o BuscaONG
- [x] `app/(backend)/README.md` (removido; o conteúdo está em [padroes-api.md](padroes-api.md))

Vários desses têm bugs conhecidos; ver [erros-a-consertar.md](erros-a-consertar.md).

### Front-end (~610 linhas)

- [x] `app/(frontend)/(auth)/**`: login (`LoginForm`) e a tela de recuperar a senha foram reescritos; o `logout/page.tsx` (saía da conta por `GET`) foi removido. O cadastro genérico (`/cadastro`, `CadastroForm`, `PasswordRequirement`) e o `POST /api/users` já foram removidos
- [x] `app/(frontend)/(landing-pages)/page.tsx` (virou a tela do mapa)
- [x] `app/(frontend)/admin/**` (reescrito: login da equipe e as telas A1 a A4; o dashboard do template foi removido)
- [x] `app/not-found.tsx` (reescrito)

### Componentes (~415 linhas)

- [x] `components/base/input/*` (`ValidatedInput`, `BaseCheckbox`, `RequiredTag`) (removidos)
- [x] `components/base/nav/InitialNav` (removido)
- [x] `components/auth/*` (`CredentialsLoginForm`, `CredentialsButton`, `GoogleLoginButton`, `LoginOptionals`) (removidos)
- [x] `components/common/ToastProvider.tsx`: reescrito como `Avisos.tsx`, com as cores dos tokens (o ícone de erro padrão era vermelho, fora da paleta)

`components/base/brand/BuscaOngLogo.tsx` é **novo**, feito a partir do design do projeto.

### Utilitários e núcleo (~315 linhas)

- [x] `utils/api/server/*`: `validBody`, `errorHandlers` e `toErrorMessage` foram reescritos em `lerJson.ts` e `respostas.ts`; `blockForbiddenRequests` e `getUserFromRequest` foram removidos
- [x] `utils/validations/index.ts`: `hasUppercase` e afins deram lugar a `lib/senha.ts`; `zod.ts` e `isSafeRedirect` foram removidos
- [x] `types/index.ts` (`AllowedRoutes`): removido, sem uso
- [x] `proxy.ts`: reescrito com a checagem otimista do cookie (`getSessionCookie`), sem `ROUTE_CONFIG` nem `matchesAnyPattern`; o redirecionamento de quem já está logado foi para as páginas `/login` e `/admin`
- [x] `auth.ts`: a configuração segue a documentação do better-auth. O plugin `customSession` do template deu lugar ao `user.additionalFields.role`, e o bloco comentado do Google saiu (o Google para ONGs será feito do zero)
- [x] `lib/email/*`: o wrapper do Resend foi reescrito a partir da documentação dele; o template `ResetPasswordEmail` foi removido (os templates atuais são do BuscaONG e escapam o HTML)

### Estilos

- [x] `app/globals.css`: os utilitários do template (`button-md`, `button-lg`, `login-button`, `login-background`, `opacityTransition`, `colorTransition`, `optional-label`, `auth-*` e `divisor`) foram removidos. Os tokens de cor e fonte são do projeto.

### Testes (~135 linhas)

- [x] `web/tests/integration/**`: o mock de sessão (`mocks/auth.ts`) e o `setup.ts` foram reescritos; o `mocks/requests.ts` saiu (cada teste monta a própria requisição); os testes de `/api/users` saíram com as rotas
- [x] `web/tests/e2e/example.spec.ts`: removido; o caso dele (a engrenagem leva ao passo 1 do cadastro) entrou no teste da engrenagem em `mapa.spec.ts`

### Fora do código-fonte

- [x] `web/docs/API.md`, `FRONTEND.md`, `BETTER-AUTH.md`: removidos e reescritos como [padroes-api.md](padroes-api.md), [padroes-frontend.md](padroes-frontend.md) e [autenticacao.md](autenticacao.md)
- [x] `.husky/pre-commit`, `.husky/pre-push`: reescritos. O pre-push agora compara com a `main` (antes comparava com a própria branch remota, ou só o que não estava no stage) e roda `lint:check` em vez do `lint` com `--fix`; saiu o trecho de e2e e build na `main`, que não era alcançável
- [x] `bruno/**`: `collection.bru`, ambientes e `auth/` reescritos. O login usa o e-mail e a senha do ambiente (antes tinha um e-mail fixo) e guarda o cookie assinado (o token cru não abria sessão). `session/` virou `auth/sessao.bru` (a rota antiga não existia), e há `auth/sair.bru`. As requisições de users foram removidas
- [x] `README.md`: a seção "Padrões de projeto", adaptada do template, foi trocada por um índice da documentação
- [x] Modificação no `components/ui/sidebar.tsx` (prop `iconClassName`): o arquivo foi removido junto com o dashboard

## 3. Não é do template

| Item | Origem / licença |
|---|---|
| `components/ui/*`, `hooks/use-mobile.ts`, `lib/utils.ts`, `components.json` | shadcn/ui (MIT) |
| Modelos `User`, `Session`, `Account`, `Verification` do `schema.prisma`, `api/auth/[...all]/route.ts`, `lib/auth-client.ts` | documentação do better-auth |
| `services/db/index.ts` (singleton do Prisma) | documentação do Prisma |
| `playwright.config.ts`, `web/.gitignore`, `eslint.config.mjs`, `postcss.config.mjs`, base do `tsconfig.json`, `next.config.ts` | gerados ou descritos pela documentação de Next, Playwright, Tailwind |
| `package.json`, `.npmrc`, `pnpm-workspace.yaml`, `.vscode/settings.json` | configuração trivial |
| `design/` | material de design do projeto, exportado por ferramenta de design (`support.js` é o runtime da ferramenta; conferir se os termos permitem publicá-lo) |
| `docs/*`, `AGENTS.md`, `CLAUDE.md`, `BuscaOngLogo.tsx`, `icon.svg`, tokens de cor | escritos para o BuscaONG |
