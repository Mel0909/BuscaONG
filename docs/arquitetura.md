# Arquitetura do repositório

Como o repositório do BuscaONG (marca pública **perto**) está organizado, para que serve cada parte e onde colocar código novo. Produto e stack ficam em [buscaong.md](buscaong.md).

## 1. Visão geral

O repositório é um **monorepo com pnpm workspaces** (sem Turborepo ou Nx) e tem dois níveis:

```
raiz   → como o projeto é desenvolvido, testado e documentado (não vai para produção)
web/   → o site: o que ele é e precisa para funcionar (é o que vai para a Vercel)
```

Hoje existe um único workspace, o `web/` (pacote `web`). Se no futuro surgir outro pacote, ele entra em `pnpm-workspace.yaml`.

## 2. Raiz do repositório

```
BuscaONG/
├── .claude/              configurações do Claude Code (settings.local.json fica fora do git)
├── .github/workflows/    CI: convencoes.yml confere branch, título e commits dos PRs
├── .husky/               hooks do git (pre-commit, commit-msg, pre-push) + validar-branch.sh
├── .vscode/              configurações compartilhadas do editor
├── bruno/                coleção de requisições da API (app Bruno)
├── design/               material de design (PDF, protótipo do mapa)
├── docs/                 documentação técnica (versionada) · estado-anterior.md (só local)
├── web/                  o app Next.js
├── .gitignore            o que o git não versiona
├── .npmrc                como o pnpm instala
├── AGENTS.md             instruções para agentes de IA (Codex/GPT, Claude, Cursor...): regras e índice dos docs
├── CLAUDE.md             importa o AGENTS.md para o Claude Code
├── commitlint.config.mjs regras de mensagem de commit (Conventional Commits)
├── README.md             apresentação e setup para pessoas
├── package.json          "identidade" do repositório (private, não é publicado)
├── pnpm-lock.yaml        versões exatas de todas as dependências
├── pnpm-workspace.yaml   lista dos workspaces (hoje só web)
└── tsconfig.base.json    opções comuns do TypeScript (estendido pelo web/tsconfig.json)
```

### 2.1 Gerenciamento de dependências

| Item | Função |
|---|---|
| `package.json` | Nome do repo (`buscaong`); `engines` (Node ≥ 24) e `packageManager` (pnpm 10.34.9); scripts atalho; **ferramentas de desenvolvimento** (TypeScript, ESLint, Vitest, Vite, Playwright, Testing Library, `@types/*`, commitlint, husky; versões e motivos em [buscaong.md §8.1.1](buscaong.md)); `pnpm.onlyBuiltDependencies` (libera os scripts de instalação do Prisma) e `pnpm.ignoredBuiltDependencies`. |
| `pnpm-workspace.yaml` | Quais pastas são projetos. |
| `pnpm-lock.yaml` | Versão **exata** de cada pacote, incluindo os transitivos. Um único lockfile para o monorepo todo; garante instalação idêntica em qualquer máquina e na Vercel. |
| `.npmrc` | `node-linker=hoisted` instala tudo num `node_modules` único na raiz. `enable-pre-post-scripts=true` permite o `postinstall` do web (gera o cliente Prisma). |
| `node_modules/` | Pacotes instalados. Não versionado; recriado por `pnpm install`. |

### 2.2 Qualidade automática (`.husky/`)

Hooks do git, válidos para o repositório inteiro (por isso ficam na raiz, onde está o `.git`):

| Hook | Quando roda | O que faz |
|---|---|---|
| `pre-commit` | antes de cada commit | bloqueia commit na `main` e valida o nome da branch; se há arquivos de `web/` no stage, `pnpm --filter web test` |
| `commit-msg` | ao escrever a mensagem | valida a mensagem com o commitlint |
| `pre-push` | antes de cada push | bloqueia push para a `main`; se há mudanças em `web/`, `lint` |

O workflow `.github/workflows/convencoes.yml` repete as checagens de branch e commit no servidor e valida o título do PR. Regras completas em [git.md](git.md).

### 2.3 Ferramentas e documentação

| Item | Função |
|---|---|
| `bruno/` | Requisições prontas (auth, session, users) e ambientes Dev/Prod para testar a API no app [Bruno](https://www.usebruno.com/). Também documenta a API. |
| `.vscode/settings.json` | Indentação de 2 espaços para todo o time. |
| `README.md` | Para pessoas: o que é o projeto e como rodar. |
| `docs/` | Documentação técnica do time (produto, arquitetura, padrões, git, bugs). |
| `AGENTS.md` | Instruções para agentes de IA: regras obrigatórias, comandos e índice dos docs. É a **fonte única**; o `CLAUDE.md` só o importa (`@AGENTS.md`). |
| `design/` | Referência visual. Não faz parte do build. |

## 3. O app (`web/`)

```
web/
├── prisma/
│   └── schema.prisma    modelos do banco (MongoDB)
├── public/              arquivos estáticos servidos na raiz do site (/favicon, /icons/...)
├── src/                 código do app (ver §4)
├── tests/
│   ├── integration/     Vitest: testes das rotas da API, com mocks de auth e banco
│   └── e2e/             Playwright: testes no navegador
├── .env.example         modelo das variáveis de ambiente (copiar para .env)
├── components.json      configuração do shadcn/ui (onde gerar componentes)
├── eslint.config.mjs    regras de lint (eslint-config-next)
├── next.config.ts       configuração do Next (raiz do Turbopack, SVG via SVGR, env do Resend)
├── playwright.config.ts configuração dos testes e2e
├── postcss.config.mjs   plugin do Tailwind CSS 4
├── tsconfig.json        estende ../tsconfig.base.json; opções do Next + aliases de import
├── vitest.config.ts     configuração dos testes de integração
└── package.json         dependências do app (runtime + configs ligadas ao Next) e scripts
```

Arquivos gerados, não versionados: `.next/` (build e cache do Next), `next-env.d.ts`, `src/generated/` (cliente Prisma) e `.env`.

### 3.1 Scripts do `web/`

| Script | Faz |
|---|---|
| `dev` | servidor de desenvolvimento (Turbopack) em http://localhost:3000 |
| `build` / `start` | build de produção / roda o build |
| `lint` / `lint:check` | ESLint corrigindo / só verificando |
| `test` / `test:watch` / `coverage` | Vitest (integração) |
| `test:e2e` / `test:complete` | Playwright / Vitest + Playwright |
| `postinstall` | `prisma generate` (automático após `pnpm install`) |

Da raiz, os principais têm atalho: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint` (= `lint:check`), `pnpm lint:fix`, `pnpm test`, `pnpm test:e2e`. Os demais: `pnpm --filter web <script>`.

**Onde fica cada dependência:**
- **`web/package.json`:** o que o site usa para funcionar (Next, React, Prisma Client, better-auth...) e as configs ligadas ao Next (`eslint-config-next`, `prisma` CLI, Tailwind, SVGR).
- **Raiz:** as ferramentas de desenvolvimento.

## 4. Código do app (`web/src/`)

### 4.1 A regra principal: `app/` vira URL

No Next.js (App Router), **a estrutura de pastas dentro de `app/` define as URLs**. Nomes de arquivo com função fixa:

| Arquivo | Vira |
|---|---|
| `page.tsx` | página acessível no navegador |
| `route.ts` | endpoint da API |
| `layout.tsx` | moldura que envolve as páginas da pasta |
| `not-found.tsx` | página 404 |

Convenções de pasta:
- **`(nome)`**: *route group*. Organiza, mas **não aparece na URL**.
- **`[nome]`**: segmento dinâmico (`[id]` → `/api/users/123`).
- **`_nome`**: pasta privada, **nunca** vira rota.

Tudo **fora** de `app/` é código comum, que as páginas importam; o Next não cria URL para nada disso.

### 4.2 Estrutura

```
src/
├── app/                          O QUE o site tem
│   ├── (frontend)/               páginas
│   │   ├── (landing-pages)/      /            (home)
│   │   ├── (auth)/               /login, /cadastro, /logout
│   │   │   └── login/_components/   componentes usados só no /login
│   │   └── admin/                /admin (login do admin), /admin/dashboard
│   ├── (backend)/                back-end
│   │   ├── api/                  endpoints REST (route.ts)
│   │   ├── services/             acesso ao banco via Prisma
│   │   └── schemas/              validação de entrada com Zod
│   ├── layout.tsx                layout raiz (fontes do perto, <html>, toasts)
│   ├── globals.css               Tailwind, tokens de cor/fonte do perto e estilos globais
│   ├── icon.svg                  favicon (marca do perto; convenção do Next)
│   └── not-found.tsx             404
├── components/                   peças visuais reutilizáveis
│   ├── ui/                       shadcn/ui (button, input, sidebar, sheet, tooltip...)
│   ├── base/                     componentes do projeto (ValidatedInput, BaseCheckbox, InitialNav...)
│   │   └── brand/PertoLogo.tsx   logo do perto (PertoMark + PertoLogo)
│   ├── auth/                     peças de login usadas em mais de uma tela
│   └── common/                   globais (ToastProvider)
├── hooks/                        hooks React reutilizáveis (use-mobile)
├── lib/                          integração com libs e serviços
│   ├── auth-client.ts            cliente better-auth para o navegador
│   ├── email/                    envio via Resend + templates de e-mail
│   └── utils.ts                  cn() para combinar classes Tailwind
├── utils/                        funções auxiliares do projeto
│   ├── api/server/               helpers das rotas: blockForbiddenRequests, getUserFromRequest, validBody, errorHandlers
│   ├── api/toErrorMessage.ts     erro → texto legível
│   └── validations/              regras de senha e e-mail
├── types/                        tipos compartilhados (AllowedRoutes)
├── generated/                    cliente Prisma gerado (não editar, não versionado)
├── auth.ts                       configuração central do better-auth
└── proxy.ts                      "porteiro": roda antes de cada página e protege rotas
```

### 4.3 Arquivos centrais

- **`auth.ts`:** configuração do better-auth. Adapter Prisma/MongoDB, login por e-mail e senha, e o plugin `customSession`, que coloca o `role` do usuário na sessão. É importado por páginas, rotas da API e pelo proxy.
- **`proxy.ts`:** executa antes de cada página (exceto `/api` e arquivos estáticos) e redireciona conforme a sessão:
  - **Precisa de login:** `/dashboard`, `/perfil`, `/settings`.
  - **Precisa de `ADMIN`:** `/admin/**`.
  - **Quem já está logado é redirecionado para `/`:** `/login`, `/cadastro`.
  - O Next exige esse nome e esse local (no Next 16, `proxy.ts` substituiu o `middleware.ts`).

### 4.4 Aliases de import (`tsconfig.json`)

| Alias | Aponta para |
|---|---|
| `@/*` | `src/*` |
| `@/backend/*` | `src/app/(backend)/*` |
| `@/frontend/*` | `src/app/(frontend)/*` |

O `vitest.config.ts` repete esses aliases para os testes.

## 5. Fluxos

### 5.1 Requisição de página

```
navegador → proxy.ts (sessão? perfil?) → app/(frontend)/.../page.tsx → componentes de components/
                 └─ redireciona se não puder acessar
```

### 5.2 Requisição à API

```
cliente → app/(backend)/api/.../route.ts
            1. blockForbiddenRequests(request, roles)   → 401/403 se não autorizado
            2. validBody + schema Zod (schemas/)        → 400 se o corpo for inválido
            3. service (services/)                      → Prisma → MongoDB
            4. NextResponse.json(objeto)                → sucesso: só o objeto
                                                          erro: { error: { message } }
```

Regras (detalhes em [padroes-api.md](padroes-api.md)):
- A rota **não** usa o Prisma diretamente; sempre passa por um service.
- Toda entrada é validada com Zod.
- Recursos no plural (`/api/ongs`).
- Toda rota nova ganha teste de integração.

### 5.3 Autenticação

- **Servidor:** `auth.api.getSession({ headers })`, a partir de `@/auth`.
- **Navegador:** `authClient`, a partir de `@/lib/auth-client`.
- **Endpoints do better-auth:** `app/(backend)/api/auth/[...all]/route.ts` (login, logout, sessão...).
- **Banco:** os modelos `User`, `Session`, `Account` e `Verification` do `schema.prisma` pertencem ao better-auth e não devem ser alterados sem necessidade.

## 6. Onde colocar código novo

| Vou criar... | Lugar |
|---|---|
| Uma página nova | `app/(frontend)/<rota>/page.tsx` |
| Um componente usado **só** por uma página | `app/(frontend)/<rota>/_components/` |
| Um componente usado em **várias** páginas | `components/base/` (ou `components/<domínio>/`) |
| Um componente shadcn | `pnpm dlx shadcn@latest add <nome>` (gera em `components/ui/`) |
| Um endpoint da API | `app/(backend)/api/<recurso>/route.ts` |
| Acesso ao banco para um recurso | `app/(backend)/services/<recurso>/` |
| Validação de entrada | `app/(backend)/schemas/<recurso>.schema.ts` |
| Um modelo no banco | `prisma/schema.prisma` (depois `pnpm install` ou `prisma generate`) |
| Um hook React reutilizável | `hooks/` |
| Integração com serviço externo (Mapbox, R2, BrasilAPI...) | `lib/<servico>/` |
| Função auxiliar genérica | `utils/` |
| Tipo compartilhado | `types/` |
| Rota que exige login ou perfil | adicionar em `ROUTE_CONFIG` no `proxy.ts` |
| Teste de API | `tests/integration/api/<recurso>/` |
| Teste no navegador | `tests/e2e/` |
| Requisição de exemplo da API | `bruno/<recurso>/` |

Os padrões de front-end estão em [padroes-frontend.md](padroes-frontend.md) e os de autenticação em [autenticacao.md](autenticacao.md).

## 7. Inconsistências conhecidas (herdadas do template)

- `app/(frontend)/admin/dashboard/components/` deveria ser `_components/` pela convenção do projeto. Funciona porque não há `page.tsx` dentro.
- `app/(backend)/services/` e `schemas/` ficam dentro de `app/` sem serem rotas. É uma escolha do template para manter o back-end agrupado; funciona porque não têm `route.ts`.
- Bugs de código (segurança e funcionalidade) estão em [erros-a-consertar.md](erros-a-consertar.md).
