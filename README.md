# BuscaONG

Site que conecta doadores a ONGs próximas: mapa e lista de ONGs, filtros por causa, item e voluntariado, e alertas de urgência via WhatsApp.

## Estrutura do repositório

Monorepo com pnpm workspaces:

- `/web`: app Next.js (front e back), com Prisma, MongoDB e Better Auth
- `/bruno`: coleção do [Bruno](https://www.usebruno.com/) para testar e documentar a API
- `/.husky`: hooks do git (testes no pre-commit; lint, e2e e build no pre-push)
- `/.vscode`: configurações compartilhadas do editor

## Setup

```bash
git clone <link>
cd BuscaONG
pnpm install
```

Crie o arquivo `web/.env` a partir de `web/.env.example` e preencha as variáveis (URL do MongoDB, segredo do Better Auth etc.).

```bash
pnpm --filter web dev
```

## Tecnologias

- **Web:** Next.js, Tailwind CSS, shadcn/ui, lucide-react, react-hot-toast
- **Back:** Prisma (ORM), Zod (validação), MongoDB, Better Auth (autenticação)
- **Testes:** Vitest (integração), Playwright (e2e)

## Documentação

A documentação técnica fica em [.claude/docs](.claude/docs):

- [buscaong.md](.claude/docs/buscaong.md): produto, escopo, stack e identidade visual
- [arquitetura.md](.claude/docs/arquitetura.md): estrutura do repositório e onde colocar código novo
- [padroes-api.md](.claude/docs/padroes-api.md): como escrever rotas da API
- [padroes-frontend.md](.claude/docs/padroes-frontend.md): como organizar páginas e componentes
- [autenticacao.md](.claude/docs/autenticacao.md): better-auth e regras de conta
- [erros-a-consertar.md](.claude/docs/erros-a-consertar.md): bugs conhecidos
- [codigo-herdado.md](.claude/docs/codigo-herdado.md): código do template a reescrever
