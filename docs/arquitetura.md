# Arquitetura do repositório

Como o repositório do BuscaONG está organizado, para que serve cada parte e onde colocar código novo. Produto e stack ficam em [buscaong.md](buscaong.md).

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
| `bruno/` | Requisições prontas (auth, ongs, denúncias, admin...) e ambientes Dev/Prod para testar a API no app [Bruno](https://www.usebruno.com/). Também documenta a API. |
| `.vscode/settings.json` | Indentação de 2 espaços para todo o time. |
| `README.md` | Para pessoas: o que é o projeto e como rodar. |
| `docs/` | Documentação técnica do time (produto, arquitetura, padrões, git, bugs). |
| `AGENTS.md` | Instruções para agentes de IA: regras obrigatórias, comandos e índice dos docs. É a **fonte única**; o `CLAUDE.md` só o importa (`@AGENTS.md`). |
| `design/` | Referência visual. Não faz parte do build. |

## 3. O app (`web/`)

```
web/
├── prisma/
│   ├── schema.prisma    modelos do banco (MongoDB)
│   ├── seed.mts         listas fixas (causas, itens, atividades), índice geográfico e slug das ONGs publicadas sem slug (pnpm db:seed)
│   └── criar-admin.mts  cria uma conta de admin pelo terminal (pnpm admin:criar)
├── public/              arquivos estáticos servidos na raiz do site (/favicon, /icons/...)
├── src/                 código do app (ver §4)
├── tests/
│   ├── unit/            Vitest: funções isoladas (validações, formatadores, consulta de CNPJ, hooks)
│   ├── integration/     Vitest: testes das rotas da API, com mocks de auth, banco e Receita
│   └── e2e/             Playwright: testes no navegador (APIs simuladas com page.route)
├── .env.example         modelo das variáveis de ambiente (copiar para .env)
├── components.json      configuração do shadcn/ui (onde gerar componentes)
├── eslint.config.mjs    regras de lint (eslint-config-next)
├── next.config.ts       configuração do Next (raiz do Turbopack, SVG via SVGR)
├── vercel.json          rotinas agendadas da Vercel (revalidação diária do CNPJ)
├── playwright.config.ts configuração dos testes e2e
├── postcss.config.mjs   plugin do Tailwind CSS 4
├── tsconfig.json        estende ../tsconfig.base.json; opções do Next + aliases de import
├── vitest.config.mts    configuração dos testes unitários e de integração
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
| `db:push` | `prisma db push`: cria coleções e índices únicos no MongoDB a partir do schema |
| `db:seed` | preenche as listas fixas, cria os índices que o Prisma não declara (`2dsphere` da posição pública, slug único) e completa ONGs antigas (posição pública e slug). Rodar depois do `db:push` e a cada deploy que mudar o banco; pode repetir |
| `admin:criar` | cria uma conta de admin (pergunta e-mail, nome e senha no terminal) |

Da raiz, os principais têm atalho: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint` (= `lint:check`), `pnpm lint:fix`, `pnpm test`, `pnpm test:e2e`, `pnpm db:push`, `pnpm db:seed`, `pnpm admin:criar`. Os demais: `pnpm --filter web <script>`.

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
- **`[nome]`**: segmento dinâmico (`[id]` → `/api/admin/ongs/123`).
- **`_nome`**: pasta privada, **nunca** vira rota.

Tudo **fora** de `app/` é código comum, que as páginas importam; o Next não cria URL para nada disso.

### 4.2 Estrutura

```
src/
├── app/                          O QUE o site tem
│   ├── (frontend)/               páginas
│   │   ├── (landing-pages)/      /            (tela principal: mapa, lista, busca e filtros)
│   │   │   ├── _components/      TelaMapa (estado e layout), MapaOngs, ListaOngs, PainelFiltros...
│   │   │   └── _actions/         chamadas à API pública e à busca de lugares do Mapbox
│   │   ├── (auth)/               /login, /login/recuperar (esqueci a senha)
│   │   │   ├── _components/      moldura das telas de acesso da ONG
│   │   │   └── login/            formulário de login e, em recuperar/, o código por e-mail e a senha nova
│   │   ├── admin/                /admin (login da equipe)
│   │   │   └── (area)/           /admin/ongs, /denuncias, /imagens, /registro, /listas (A1 a A5), com a barra do admin
│   │   │       ├── _components/  ficha da ONG (contatos, Receita × declarado, ações) e peças comuns (ui.tsx)
│   │   │       ├── _actions/     chamadas às rotas /api/admin/*
│   │   │       └── _utils/       carregarAdmin: exige a sessão de um admin (no servidor)
│   │   ├── ong/[slug]/           /ong/<slug> (página pública da ONG, P5) e o formulário de denúncia (P5.1)
│   │   ├── ong/cadastro/         /ong/cadastro/* (os 8 passos do cadastro da ONG, mais continuar e retomar)
│   │   │   ├── _components/      barra de passos, telas de cada passo, mapa e peças comuns (ui.tsx, modo.tsx)
│   │   │   ├── _actions/         chamadas à API dos passos 3 a 8
│   │   │   ├── _utils/           carregarPasso (sessão, ONG e trava de passos) e dadosDosPassos (dados iniciais de cada formulário)
│   │   │   └── reiniciar/        confirmação por e-mail para limpar rascunho, mantendo a conta
│   │   ├── ong/painel/           /ong/painel/* (O2/O3): início, itens e urgência, perfil público, voluntariado
│   │   │   └── _utils/           carregarPainel: sessão da ONG publicada (no servidor)
│   │   └── termos/               /termos (termos de uso, texto provisório)
│   ├── (backend)/                back-end
│   │   ├── api/                  endpoints REST (route.ts); ongs/minha/* = cadastro e painel da ONG; GET ongs, ongs/mapa, ongs/busca e POST denuncias = área pública; admin/* = área admin; cron/* = rotinas da Vercel (exigem CRON_SECRET)
│   │   ├── services/             acesso ao banco via Prisma (ongs/: conta, cadastro, área pública, página e urgências; listas/: listas fixas; denuncias/; admin/: ONGs, imagens, listas e registro de ações)
│   │   └── schemas/              validação de entrada com Zod
│   ├── layout.tsx                layout raiz (fontes, <html>, toasts)
│   ├── globals.css               Tailwind, tokens de cor e fonte e estilos globais
│   ├── icon.svg                  favicon (marca do BuscaONG; convenção do Next)
│   └── not-found.tsx             404
├── components/                   peças visuais reutilizáveis
│   ├── ui/                       shadcn/ui (button, input, sheet, tooltip...)
│   ├── base/                     componentes do projeto: Dialogo (janela por cima da página)
│   │   ├── campos/               CampoSenha (com o olho) e CampoCodigo (6 dígitos)
│   │   └── brand/BuscaOngLogo.tsx   logo do BuscaONG (BuscaOngMark + BuscaOngLogo)
│   ├── ong/                      peças da ONG usadas em mais de uma tela (CartaoOng)
│   └── common/                   globais (ToastProvider)
├── hooks/                        hooks React reutilizáveis (use-mobile)
├── lib/                          integração com libs e serviços
│   ├── auth-client.ts            cliente better-auth para o navegador
│   ├── auth-hooks.ts             hook do better-auth: regra de senha e bloqueio do cadastro direto
│   ├── auth-consumo-otp.ts       consumo condicional de códigos, inclusive sob concorrência
│   ├── auth-limites.ts           limite por e-mail compartilhado entre aliases de códigos
│   ├── armazenamento/            URLs assinadas para enviar imagens ao Cloudflare R2
│   ├── cadastro/                 limites e regras do cadastro usados no servidor e na tela (turnos, tipos de imagem)
│   ├── mapa/                     filtros da área pública (e o formato deles na URL) e contas de geografia
│   ├── ong/                      slug da página, urgência (prazos, "há 2 h") e botões de contato da página da ONG
│   ├── denuncia/                 motivos da denúncia e limites (24 h por perfil, topo da fila)
│   ├── cnpj/                     consulta de CNPJ (BrasilAPI → Minha Receita → OpenCNPJ)
│   ├── email/                    envio via Resend (no terminal em dev) + templates de e-mail
│   ├── geocodificacao/           endereço → coordenadas pelo Nominatim (fila de 1/s e cache)
│   └── utils.ts                  cn() para combinar classes Tailwind
├── utils/                        funções auxiliares do projeto
│   ├── api/server/               helpers das rotas: exigirSessaoOng, exigirSessaoAdmin, lerJson, respostas de erro, rateLimit
│   ├── formatters/               formatação para a tela (dados da Receita, chave normalizada, iniciais)
│   └── validations/              senha e e-mail; CNPJ; contatos (WhatsApp, Instagram, site); CEP e UF
├── types/                        declarações de tipos de bibliotecas (GeoJSON)
├── generated/                    cliente Prisma gerado (não editar, não versionado)
├── auth.ts                       configuração central do better-auth
└── proxy.ts                      "porteiro": roda antes de cada página e protege rotas
```

### 4.3 Arquivos centrais

- **`auth.ts`:** configuração do better-auth. Adapter Prisma/MongoDB, login por e-mail e senha, e o plugin `customSession`, que coloca o `role` do usuário na sessão. É importado por páginas, rotas da API e pelo proxy.
- **`proxy.ts`:** executa antes de cada página (exceto `/api` e arquivos estáticos) e redireciona conforme a sessão:
  - **Precisa de login:** `/dashboard`, `/perfil`, `/settings`.
  - **Precisa de `ADMIN`:** `/admin/**` (sem login, vai para `/admin`; admin logado em `/admin` vai para `/admin/ongs`).
  - **Quem já está logado sai do `/login`:** admin para `/admin/ongs`, ONG para `/ong/painel` (que leva o cadastro não terminado ao passo em que parou).
  - O painel da ONG (`/ong/painel`) e os passos do cadastro conferem a sessão na própria página (`carregarPainel`, `carregarPasso`).
  - O Next exige esse nome e esse local (no Next 16, `proxy.ts` substituiu o `middleware.ts`).

### 4.4 Aliases de import (`tsconfig.json`)

| Alias | Aponta para |
|---|---|
| `@/*` | `src/*` |
| `@/backend/*` | `src/app/(backend)/*` |
| `@/frontend/*` | `src/app/(frontend)/*` |

O `vitest.config.mts` repete esses aliases para os testes.

## 5. Fluxos

### 5.1 Requisição de página

```
navegador → proxy.ts (sessão? perfil?) → app/(frontend)/.../page.tsx → componentes de components/
                 └─ redireciona se não puder acessar
```

### 5.2 Requisição à API

```
cliente → app/(backend)/api/.../route.ts
            1. exigirSessaoOng/exigirSessaoAdmin       → 401/403 se não autorizado
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
| Teste de função isolada (validação, formatação, regra) | `tests/unit/` |
| Teste de API | `tests/integration/api/<recurso>/` |
| Teste no navegador | `tests/e2e/` |
| Requisição de exemplo da API | `bruno/<recurso>/` |

Os padrões de front-end estão em [padroes-frontend.md](padroes-frontend.md) e os de autenticação em [autenticacao.md](autenticacao.md).

## 7. Inconsistências conhecidas (herdadas do template)

- `app/(backend)/services/` e `schemas/` ficam dentro de `app/` sem serem rotas. É uma escolha do template para manter o back-end agrupado; funciona porque não têm `route.ts`.
- Bugs de código (segurança e funcionalidade) estão em [erros-a-consertar.md](erros-a-consertar.md).
