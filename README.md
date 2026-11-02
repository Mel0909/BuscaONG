# BuscaONG

Site que conecta doadores a ONGs próximas, com mapa e lista de ONGs, filtros por causa, item e voluntariado, e destaque visual para pedidos urgentes.

## Estrutura do repositório

Monorepo com pnpm workspaces:

- `/web`: app Next.js (front e back), com Prisma, MongoDB e Better Auth
- `/bruno`: coleção do [Bruno](https://www.usebruno.com/) para testar e documentar a API
- `/.husky`: hooks do git (regras de branch e commit, testes, lint)
- `/.github`: workflow que confere as convenções de git nos PRs
- `/design`: design e protótipo
- `/.vscode`: configurações compartilhadas do editor

## Setup

```bash
git clone <link>
cd BuscaONG
pnpm install
```

Crie o arquivo `web/.env` a partir de `web/.env.example` e preencha as variáveis (URL do MongoDB, segredo do Better Auth etc.).

```bash
pnpm db:push       # coleções e índices no MongoDB
pnpm db:seed       # listas fixas (causas, itens, atividades) e índice geográfico
pnpm dev
```

A área admin (`/admin`) precisa de uma conta de admin, criada pelo terminal com `pnpm admin:criar`.

## Tecnologias

- **Web:** Next.js, Tailwind CSS, shadcn/ui, lucide-react, react-hot-toast
- **Back:** Prisma (ORM), Zod (validação), MongoDB, Better Auth (autenticação)
- **Testes:** Vitest (integração), Playwright (e2e)

## Contribuindo

- Nada vai direto para a `main`: crie uma branch `<tipo>/<descricao>` (ex.: `feat/cadastro-ong`) e abra um PR.
- Commits e título do PR seguem o [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), em português, e devem ser atômicos.
- Hooks do git e um workflow no GitHub conferem essas regras.

Detalhes e exemplos em [docs/git.md](docs/git.md).

## Documentação

A documentação técnica fica em [docs](docs). Agentes de IA (Codex/GPT, Claude Code etc.) leem as instruções do projeto em [AGENTS.md](AGENTS.md).

- [git.md](docs/git.md): branches, commits e PRs
- [buscaong.md](docs/buscaong.md): produto, escopo, stack e identidade visual
- [arquitetura.md](docs/arquitetura.md): estrutura do repositório e onde colocar código novo
- [padroes-api.md](docs/padroes-api.md): como escrever rotas da API
- [padroes-frontend.md](docs/padroes-frontend.md): como organizar páginas e componentes
- [autenticacao.md](docs/autenticacao.md): better-auth e regras de conta
- [erros-a-consertar.md](docs/erros-a-consertar.md): bugs conhecidos
- [codigo-herdado.md](docs/codigo-herdado.md): código do template a reescrever
