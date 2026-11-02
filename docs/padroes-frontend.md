# Padrões do front-end

Como organizar páginas e componentes no BuscaONG (`web/src/`). A estrutura de pastas completa está em [arquitetura.md §4](arquitetura.md) e a identidade visual em [buscaong.md §11](buscaong.md).

## 1. Componentes

- **Pequenos e com uma responsabilidade.** Se um componente passa de ~200 linhas ou faz duas coisas, divida.
- **Composição antes de props demais:** prefira passar `children` a criar dezenas de flags.
- **Server Component por padrão.** Só use `'use client'` quando precisar de estado, efeitos, eventos ou APIs do navegador (o mapa do Mapbox, por exemplo, será client).

## 2. Onde cada componente mora

| Uso | Lugar |
|---|---|
| Usado em várias páginas | `components/` (`base/` para peças do projeto, `<domínio>/` para um assunto, ex.: `components/ong/`) |
| Usado só por uma página ou layout | `app/(frontend)/<rota>/_components/` |
| Componente do shadcn/ui | `components/ui/` (gerado com `pnpm dlx shadcn@latest add <nome>`) |
| Logo e marca | `components/base/brand/` |
| Janela por cima da página (formulário curto, confirmação) | `components/base/Dialogo.tsx`: folha que sobe no celular, caixa centralizada no computador; Esc e o fundo fecham |
| Campo de senha (com o olho) e de código de 6 dígitos | `components/base/campos/` |

O `_` no nome da pasta (`_components`, `_utils`, `_actions`) a torna **privada**: o Next nunca a transforma em rota. Use o mesmo prefixo para utilitários e ações que só servem àquela página.

"Domínio" é o assunto do código: `ong`, `causa`, `denuncia`, `mapa`.

**Formulários da ONG reaproveitados:** os passos 3 a 7 do cadastro (`ong/cadastro/_components/Passo*.tsx`) também são as telas de edição do painel (`ong/painel`). Dentro de `<ModoPainel>` (`ong/cadastro/_components/modo.tsx`) eles escondem o título do passo e o "Voltar", e salvar fica na página em vez de seguir para o próximo passo. Os dados iniciais de cada formulário saem de `ong/cadastro/_utils/dadosDosPassos.ts`.

## 3. Chamadas à API

- Funções que chamam o back-end ficam em pastas **`actions`** (em `<rota>/_actions/` se forem locais, ou num `actions/` compartilhado). O nome evita confusão com os `services` do back-end.
- **Ainda não há biblioteca de cache e busca de dados instalada** (SWR, TanStack Query etc.). A escolha fica para a primeira feature que precisar; até lá, use `fetch`.
- Dados que podem ser lidos no servidor devem ser buscados no Server Component, sem passar pela API.

## 4. Convenções de UI

- **Ícones:** `lucide-react`.
- **Fontes:** só via `next/font` (já configuradas no `layout.tsx`); use as classes `font-sans`, `font-display` e `font-mono`.
- **Cores:** só os tokens do projeto (`bg-musgo`, `text-tinta`, `border-borda`...). **Terracota é exclusiva de urgência.**
- **Feedback ao usuário:** `toast.success(...)` e `toast.error(...)` do `react-hot-toast` (o `ToastProvider` já está no layout).
- **Classes condicionais:** `cn()` de `@/lib/utils`.

## 5. Ordem dos imports

Agrupe e ordene os imports assim:

1. Bibliotecas e hooks (`react`, `next/*`, hooks próprios)
2. Funções auxiliares (`@/utils`, `@/lib`)
3. Tipos
4. Ícones e CSS
5. Componentes gerais (`@/components/...`)
6. Componentes do próprio domínio (`./_components/...`)
