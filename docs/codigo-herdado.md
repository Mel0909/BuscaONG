# Código herdado do template

Inventário do que ainda veio do template "monorepo base" (de onde saiu o projeto noctiluz), levantado em 2026-10-02.

**Decisão:** o código abaixo é **mantido por enquanto e reescrito aos poucos**, conforme as features de ONG e Admin forem implementadas. A meta é não sobrar nada da seção 2 até o lançamento do BuscaONG.

> Isto é um inventário técnico, não um parecer jurídico. O template não tinha arquivo LICENSE, o que por padrão significa "todos os direitos reservados" aos autores. A propriedade de software feito por membros de empresa júnior depende do estatuto e dos termos de voluntariado da organização.

O repositório não tem commits feitos antes da limpeza, então nada removido ficou no histórico do git.

## 1. Já removido: identidade do noctiluz


## 2. A reescrever: autoria do template

Caminhos de código relativos a `web/src/`. Ao reescrever, **não copiar o código antigo**: partir do requisito do BuscaONG e da documentação oficial das bibliotecas. Marque `[x]` quando o item for substituído ou removido.

### Back-end (~500 linhas)

- [x] `app/(backend)/api/users/**` (listagem, conta por ID, troca de e-mail e senha): removidas, sem uso nas telas
- [x] `app/(backend)/api/password/forgot`, `reset`: reescritas para recuperação por código via better-auth, com validação, limites e testes
- [ ] `app/(backend)/schemas/base.schema.ts` (`auth.schema.ts` foi removido)
- [ ] `app/(backend)/services/auth/*` (`services/users/*` foi removido)
- [ ] `app/(backend)/README.md`

Vários desses têm bugs conhecidos; ver [erros-a-consertar.md](erros-a-consertar.md).

### Front-end (~610 linhas)

- [ ] `app/(frontend)/(auth)/**`: login (`LoginForm`) e a tela de recuperar a senha foram reescritos; falta o `logout/page.tsx`. O cadastro genérico (`/cadastro`, `CadastroForm`, `PasswordRequirement`) e o `POST /api/users` já foram removidos
- [x] `app/(frontend)/(landing-pages)/page.tsx` (virou a tela do mapa)
- [x] `app/(frontend)/admin/**` (reescrito: login da equipe e as telas A1 a A4; o dashboard do template foi removido)
- [x] `app/not-found.tsx` (reescrito)

### Componentes (~415 linhas)

- [x] `components/base/input/*` (`ValidatedInput`, `BaseCheckbox`, `RequiredTag`) (removidos)
- [x] `components/base/nav/InitialNav` (removido)
- [x] `components/auth/*` (`CredentialsLoginForm`, `CredentialsButton`, `GoogleLoginButton`, `LoginOptionals`) (removidos)
- [ ] `components/common/ToastProvider.tsx`

`components/base/brand/BuscaOngLogo.tsx` é **novo**, feito a partir do design do projeto.

### Utilitários e núcleo (~315 linhas)

- [ ] `utils/api/server/*` (`blockForbiddenRequests`, `getUserFromRequest`, `validBody`, `errorHandlers`)
- [ ] `utils/api/toErrorMessage.ts`, `utils/validations/*`
- [ ] `types/index.ts` (`AllowedRoutes`)
- [ ] `proxy.ts`: a lógica de `ROUTE_CONFIG` e `matchesAnyPattern` é do template. O nome e a função do arquivo são convenção do Next.
- [ ] `auth.ts`: a configuração em si segue a documentação do better-auth. O plugin `customSession` com role é do template.
- [ ] `lib/email/*`: o template `ResetPasswordEmail` foi removido; falta revisar o wrapper do Resend

### Estilos

- [x] `app/globals.css`: os utilitários do template (`button-md`, `button-lg`, `login-button`, `login-background`, `opacityTransition`, `colorTransition`, `optional-label`, `auth-*` e `divisor`) foram removidos. Os tokens de cor e fonte são do projeto.

### Testes (~135 linhas)

- [ ] `web/tests/integration/**` (mocks de auth e request; os testes de `/api/users` saíram com as rotas)
- [ ] `web/tests/e2e/example.spec.ts` (reescrito na Etapa 2, mas segue a estrutura do original)

### Fora do código-fonte

- [x] `web/docs/API.md`, `FRONTEND.md`, `BETTER-AUTH.md`: removidos e reescritos como [padroes-api.md](padroes-api.md), [padroes-frontend.md](padroes-frontend.md) e [autenticacao.md](autenticacao.md)
- [ ] `.husky/pre-commit`, `.husky/pre-push`
- [ ] `bruno/**` (requisições de auth, session e users, `collection.bru`)
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
