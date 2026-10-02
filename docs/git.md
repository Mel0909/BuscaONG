# Regras de git

Como trabalhar com branches, commits e PRs no BuscaONG. As regras são verificadas automaticamente (ver §7).

## 1. Resumo

1. **Nada vai direto para a `main`.** Todo trabalho entra por branch + PR.
2. **Branches** seguem `<tipo>/<descricao-em-kebab-case>`.
3. **Commits** seguem o [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) e são **atômicos**.
4. **Título do PR** segue a mesma regra dos commits.
5. **Merge preserva os commits** (sem squash).
6. **Idioma:** descrições em **português**. Os tipos (`feat`, `fix`...) ficam em inglês, como manda o padrão.

## 2. A `main` é protegida

- Ninguém commita nem dá push direto na `main`.
- **Única exceção:** o commit inicial `1f1088c setup: web`, feito antes destas regras existirem. Ele também não segue o formato de commit e fica como está.

## 3. Fluxo de trabalho

```bash
git switch main
git pull
git switch -c feat/cadastro-ong          # 1. branch a partir da main atualizada

# ... trabalho ...
git add -p                                # 2. adicione só o que pertence ao commit
git commit -m "feat(ong): adiciona passo de validação do CNPJ"

git push -u origin feat/cadastro-ong      # 3. envia a branch
# 4. abra o PR para a main; o workflow de convenções roda
# 5. depois de aprovado e com checks verdes, merge sem squash
```

Se a `main` andou enquanto você trabalhava, atualize a branch com `git rebase main` (ou `git merge main`) antes do merge.

## 4. Branches

**Formato:** `<tipo>/<descricao>`

- `tipo`: um dos tipos da §5.1.
- `descricao`: minúsculas, números e hífens (kebab-case), **sem acento**, curta e específica.

| ✅ Válido | ❌ Inválido | Por quê |
|---|---|---|
| `feat/cadastro-ong` | `feature/cadastro-ong` | `feature` não é um tipo |
| `fix/validacao-cnpj` | `fix/validação-cnpj` | acento |
| `docs/regras-de-git` | `docs/Regras` | maiúscula |
| `chore/atualiza-typescript` | `chore/atualiza_typescript` | underline |
| `refactor/services-de-users` | `minha-branch` | sem tipo |

Uma branch = um assunto. Se o trabalho mudar de assunto, abra outra branch.

## 5. Commits

### 5.1 Formato

```
<tipo>(<escopo opcional>): <descrição>

<corpo opcional: o porquê da mudança>

<rodapé opcional: BREAKING CHANGE, referências>
```

| Tipo | Quando usar |
|---|---|
| `feat` | nova funcionalidade para o usuário |
| `fix` | correção de bug |
| `docs` | só documentação |
| `style` | formatação, sem mudar comportamento |
| `refactor` | muda o código sem mudar comportamento nem corrigir bug |
| `perf` | melhoria de desempenho |
| `test` | adiciona ou corrige testes |
| `build` | dependências, build, configuração de pacotes |
| `ci` | workflows do GitHub Actions |
| `chore` | manutenção que não se encaixa acima (hooks, configs do repo) |
| `revert` | desfaz um commit anterior |

**Escopo** (opcional, em kebab-case): a área afetada. Sugestões: `web`, `api`, `auth`, `ui`, `mapa`, `ong`, `admin`, `denuncia`, `prisma`, `deps`, `bruno`, `git`.

**Descrição:**
- Começa com **letra minúscula** e verbo no presente (`adiciona`, `corrige`, `remove`).
- Sem ponto final.
- Cabeçalho inteiro com no máximo **100 caracteres**.
- Diz **o que** muda; o **porquê** vai no corpo.

**Mudança incompatível** (quebra quem usa): `!` depois do tipo/escopo e/ou rodapé `BREAKING CHANGE: <explicação>`.

| ✅ Válido | ❌ Inválido |
|---|---|
| `feat(ong): adiciona validação de CNPJ` | `Adiciona validação de CNPJ` (sem tipo) |
| `fix(api): exige perfil admin no GET /api/users` | `feature: adiciona mapa` (tipo inexistente) |
| `docs: documenta regras de git` | `feat: Adiciona mapa` (maiúscula) |
| `build(deps): atualiza next para 16.3.8` | `feat(ONG): adiciona mapa` (escopo em maiúscula) |
| `feat(auth)!: troca perfis do enum Role` | `fix: corrige coisas.` (vago, com ponto) |

### 5.2 Commits atômicos

Cada commit contém **uma única mudança lógica, completa**:

- **Uma coisa só:** não misture uma feature com um refactor, nem uma correção com uma formatação. Se a descrição precisa de "e", provavelmente são dois commits.
- **Completo:** o projeto continua funcionando (build, lint e testes passam) em **cada** commit, não só no último.
- **Revertível:** dá para desfazer o commit sozinho com `git revert` sem quebrar outra coisa.
- **Teste junto com o código:** o teste de uma funcionalidade vai no mesmo commit da funcionalidade.
- **Use `git add -p`** para separar mudanças do mesmo arquivo em commits diferentes.

Exemplo: atualizar o TypeScript, que quebra dois arquivos:

```
build(deps): atualiza typescript para 6.0.3
fix(web): ajusta tipos incompatíveis com o typescript 6
```

Ou num commit só, se o build não passar sem os ajustes. O que **não** pode é misturar com "e também renomeei uns componentes".

## 6. Pull requests

- **Título:** mesmo formato de commit (`feat(ong): adiciona cadastro em 8 passos`).
- **Descrição:** o que muda, por quê, como testar. Links para issues ou docs quando houver.
- **Merge:** **preservando os commits** (merge commit ou rebase). **Não usar squash**: ele apagaria os commits atômicos do histórico da `main`.
- O workflow de convenções precisa estar verde.

## 7. Verificação automática

| Regra | Onde é verificada |
|---|---|
| Sem commit na `main` | `.husky/pre-commit` |
| Nome da branch | `.husky/pre-commit` e workflow `convencoes.yml` |
| Formato do commit | `.husky/commit-msg` (commitlint) e workflow `convencoes.yml` (todos os commits do PR) |
| Sem push na `main` | `.husky/pre-push` |
| Título do PR | workflow `convencoes.yml` |

Arquivos:
- `commitlint.config.mjs` (raiz): regras do commitlint (`@commitlint/config-conventional` + escopo em kebab-case).
- `.husky/validar-branch.sh`: validação do nome da branch, compartilhada entre o hook e o workflow.
- `.github/workflows/convencoes.yml`: roda em todo PR para a `main`.

**Não use `--no-verify`** para pular os hooks. Os hooks rodam só na máquina de quem commita; quem garante as regras de verdade é o servidor (ver §8).

Testar uma mensagem antes de commitar:

```bash
echo "feat(ong): adiciona mapa" | pnpm exec commitlint
```

## 8. Pendências

- **Proteção da `main` no GitHub (ainda não configurada):** os hooks podem ser pulados. Para a regra valer de verdade, configurar em *Settings → Branches* (ou *Rules*) do repositório:
  - exigir PR para a `main`;
  - exigir o check "Branch, título e commits" verde;
  - bloquear force push e exclusão;
  - deixar só "merge commit" e/ou "rebase" habilitados (desabilitar squash).
- **`.husky/pre-push`:** o trecho que roda e2e e build quando a branch atual é `main` deixou de ser alcançável na prática, já que não se trabalha mais na `main`. Avaliar mover build e e2e para um workflow de CI no PR.
- **`pnpm/action-setup` com `version: 10` fixo no workflow:** remover quando o `packageManager` for definido no `package.json` (Etapa 4).
