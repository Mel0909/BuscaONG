# Código herdado do template

Inventário do que ainda veio do template "monorepo base" (de onde saiu o projeto noctiluz), levantado em 2026-10-02.

**Decisão:** o código abaixo é **mantido por enquanto e reescrito aos poucos**, conforme as features de ONG e Admin forem implementadas. A meta é não sobrar nada da seção 2 até o lançamento do BuscaONG.

> Isto é um inventário técnico, não um parecer jurídico. O template não tinha arquivo LICENSE, o que por padrão significa "todos os direitos reservados" aos autores. A propriedade de software feito por membros de empresa júnior depende do estatuto e dos termos de voluntariado da organização.

O repositório não tem commits feitos antes da limpeza, então nada removido ficou no histórico do git.

## 1. Já removido: identidade do noctiluz


## 2. A reescrever: autoria do template

Caminhos de código relativos a `web/src/`. Ao reescrever, **não copiar o código antigo**: partir do requisito do BuscaONG e da documentação oficial das bibliotecas. Marque `[x]` quando o item for substituído ou removido.

### Back-end (~500 linhas)

- [ ] `app/(backend)/api/users/**` (CRUD de users, troca de e-mail e senha)
- [ ] `app/(backend)/api/password/forgot`, `reset`
- [ ] `app/(backend)/schemas/*` (`auth.schema.ts`, `base.schema.ts`)
- [ ] `app/(backend)/services/auth/*`, `services/users/*`
- [ ] `app/(backend)/README.md`

Vários desses têm bugs conhecidos; ver [erros-a-consertar.md](erros-a-consertar.md).

### Front-end (~610 linhas)

- [ ] `app/(frontend)/(auth)/**` (login, logout, `LoginForm`). O cadastro genérico (`/cadastro`, `CadastroForm`, `PasswordRequirement`) e o `POST /api/users` já foram removidos
- [ ] `app/(frontend)/(landing-pages)/page.tsx` (será substituído no Hello World da Etapa 5)
- [ ] `app/(frontend)/admin/**` (página de login do admin, `AdminForm`, layout do dashboard, `AdminHeader`, sidebar, `admin.css`)
- [ ] `app/not-found.tsx` (texto e estrutura; a imagem já foi trocada)

### Componentes (~415 linhas)

- [ ] `components/base/input/*` (`ValidatedInput`, `BaseCheckbox`, `RequiredTag`)
- [ ] `components/base/nav/InitialNav`
- [ ] `components/auth/*` (`CredentialsLoginForm`, `CredentialsButton`, `GoogleLoginButton`, `LoginOptionals`)
- [ ] `components/common/ToastProvider.tsx`

`components/base/brand/BuscaOngLogo.tsx` é **novo**, feito a partir do design do projeto.

### Utilitários e núcleo (~315 linhas)

- [ ] `utils/api/server/*` (`blockForbiddenRequests`, `getUserFromRequest`, `validBody`, `errorHandlers`)
- [ ] `utils/api/toErrorMessage.ts`, `utils/validations/*`
- [ ] `types/index.ts` (`AllowedRoutes`)
- [ ] `proxy.ts`: a lógica de `ROUTE_CONFIG` e `matchesAnyPattern` é do template. O nome e a função do arquivo são convenção do Next.
- [ ] `auth.ts`: a configuração em si segue a documentação do better-auth. O plugin `customSession` com role é do template.
- [ ] `lib/email/*` (wrapper do Resend, template `ResetPasswordEmail`)

### Estilos

- [ ] `app/globals.css`: os utilitários `button-md`, `button-lg`, `login-button`, `login-background`, `opacityTransition`, `colorTransition`, `optional-label`, `auth-*` e `divisor` são do template. Os tokens de cor e fonte já são do projeto.

### Testes (~135 linhas)

- [ ] `web/tests/integration/**` (teste de `POST /api/users`, mocks de auth, request e user)
- [ ] `web/tests/e2e/example.spec.ts` (reescrito na Etapa 2, mas segue a estrutura do original)

### Fora do código-fonte

- [x] `web/docs/API.md`, `FRONTEND.md`, `BETTER-AUTH.md`: removidos e reescritos como [padroes-api.md](padroes-api.md), [padroes-frontend.md](padroes-frontend.md) e [autenticacao.md](autenticacao.md)
- [ ] `.husky/pre-commit`, `.husky/pre-push`
- [ ] `bruno/**` (requisições de auth, session e users, `collection.bru`)
- [x] `README.md`: a seção "Padrões de projeto", adaptada do template, foi trocada por um índice da documentação
- [ ] Modificação no `components/ui/sidebar.tsx` (prop `iconClassName`); o resto do arquivo é shadcn

## 3. Não é do template

| Item | Origem / licença |
|---|---|
| `components/ui/*`, `hooks/use-mobile.ts`, `lib/utils.ts`, `components.json` | shadcn/ui (MIT) |
| Modelos `User`, `Session`, `Account`, `Verification` do `schema.prisma`, `api/auth/[...all]/route.ts`, `lib/auth-client.ts` | documentação do better-auth |
| `services/db/index.ts` (singleton do Prisma) | documentação do Prisma |
| `playwright.config.ts`, `web/.gitignore`, `eslint.config.mjs`, `postcss.config.mjs`, base do `tsconfig.json`, `next.config.ts` | gerados ou descritos pela documentação de Next, Playwright, Tailwind |
| `package.json`, `.npmrc`, `pnpm-workspace.yaml`, `.vscode/settings.json` | configuração trivial |
| `web/public/icons/google-logo.png` | marca do Google, uso permitido no botão de login com Google |
| `design/` | material de design do projeto, exportado por ferramenta de design (`support.js` é o runtime da ferramenta; conferir se os termos permitem publicá-lo) |
| `docs/*`, `AGENTS.md`, `CLAUDE.md`, `BuscaOngLogo.tsx`, `icon.svg`, tokens de cor | escritos para o BuscaONG |
