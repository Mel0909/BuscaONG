# BuscaONG

## Regras de git (obrigatórias)

- **Nunca commitar nem dar push na `main`.** Trabalhar sempre numa branch e entregar por PR.
- **Branch:** `<tipo>/<descricao-em-kebab-case>`, em português e sem acento (ex.: `feat/cadastro-ong`).
- **Commits:** Conventional Commits, descrição em português e em minúscula (ex.: `fix(api): exige perfil admin no GET /api/users`). **Atômicos**: uma mudança lógica por commit, com build e testes passando em cada um.
- **Título do PR:** mesmo formato dos commits. Merge preservando os commits (sem squash).
- **Não usar `--no-verify`.**
- Detalhes: [.claude/docs/git.md](.claude/docs/git.md)

## Documentação

- Estado do repositório antes da limpeza : [.claude/docs/estado-anterior.md](.claude/docs/estado-anterior.md)
- Produto, escopo, stack e versões do BuscaONG (marca pública "perto"): [.claude/docs/buscaong.md](.claude/docs/buscaong.md)
- Arquitetura do repositório, estrutura de pastas e onde colocar código novo: [.claude/docs/arquitetura.md](.claude/docs/arquitetura.md)
- Padrões para rotas da API (camadas, validação, formato de resposta): [.claude/docs/padroes-api.md](.claude/docs/padroes-api.md)
- Padrões de front-end (componentes, pastas, UI, imports): [.claude/docs/padroes-frontend.md](.claude/docs/padroes-frontend.md)
- Autenticação com better-auth e regras de conta: [.claude/docs/autenticacao.md](.claude/docs/autenticacao.md)
- Regras de git (branches, commits, PRs, verificação automática): [.claude/docs/git.md](.claude/docs/git.md)
- Bugs e problemas conhecidos, ainda não corrigidos: [.claude/docs/erros-a-consertar.md](.claude/docs/erros-a-consertar.md)
- Código herdado do template a reescrever antes do lançamento (não copiar ao reescrever): [.claude/docs/codigo-herdado.md](.claude/docs/codigo-herdado.md)
