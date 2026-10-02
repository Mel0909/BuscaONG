# BuscaONG

## Regras de git (obrigatórias)

- **Nunca commitar nem dar push na `main`.** Trabalhar sempre numa branch e entregar por PR.
- **Branch:** `<tipo>/<descricao-em-kebab-case>`, em português e sem acento (ex.: `feat/cadastro-ong`).
- **Commits:** Conventional Commits, descrição em português e em minúscula (ex.: `fix(api): exige perfil admin no GET /api/users`). **Atômicos**: uma mudança lógica por commit, com build e testes passando em cada um.
- **Título do PR:** mesmo formato dos commits. Merge preservando os commits (sem squash).
- **Não usar `--no-verify`.**
- Detalhes: [docs/git.md](docs/git.md)

## Documentação

- Estado do repositório antes da limpeza : [docs/estado-anterior.md](docs/estado-anterior.md)
- Produto, escopo, stack e versões do BuscaONG (marca pública "perto"): [docs/buscaong.md](docs/buscaong.md)
- Arquitetura do repositório, estrutura de pastas e onde colocar código novo: [docs/arquitetura.md](docs/arquitetura.md)
- Padrões para rotas da API (camadas, validação, formato de resposta): [docs/padroes-api.md](docs/padroes-api.md)
- Padrões de front-end (componentes, pastas, UI, imports): [docs/padroes-frontend.md](docs/padroes-frontend.md)
- Autenticação com better-auth e regras de conta: [docs/autenticacao.md](docs/autenticacao.md)
- Regras de git (branches, commits, PRs, verificação automática): [docs/git.md](docs/git.md)
- Bugs e problemas conhecidos, ainda não corrigidos: [docs/erros-a-consertar.md](docs/erros-a-consertar.md)
- Código herdado do template a reescrever antes do lançamento (não copiar ao reescrever): [docs/codigo-herdado.md](docs/codigo-herdado.md)
