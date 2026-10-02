// Conventional Commits: tipo(escopo opcional): descrição
// regras completas em docs/git.md
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-case': [2, 'always', 'kebab-case'],
  },
};
