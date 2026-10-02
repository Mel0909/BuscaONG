# Valida o nome da branch: <tipo>/<descricao-em-kebab-case>
# Usado pelo pre-commit e pelo workflow de convenções (.github/workflows/convencoes.yml).
# Uso: sh .husky/validar-branch.sh <nome-da-branch>

BRANCH="$1"
TIPOS="feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert"

if ! echo "$BRANCH" | grep -Eq "^($TIPOS)/[a-z0-9]+(-[a-z0-9]+)*$"; then
  echo "Nome de branch inválido: '$BRANCH'"
  echo "Use <tipo>/<descricao-em-kebab-case>, ex.: feat/cadastro-ong, fix/validacao-cnpj"
  echo "Tipos: $(echo "$TIPOS" | tr '|' ' ')"
  exit 1
fi
