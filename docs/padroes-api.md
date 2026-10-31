# Padrões da API

Como escrever endpoints no back-end do BuscaONG (`web/src/app/(backend)/`). A visão geral do fluxo de uma requisição está em [arquitetura.md §5.2](arquitetura.md).

## 1. Princípios

- **REST:** um recurso por URL, verbo HTTP indica a ação (`GET` lê, `POST` cria, `PATCH` atualiza parcialmente, `DELETE` remove).
- **Recursos no plural e em português:** `/api/ongs`, `/api/denuncias`, `/api/causas`. Itens específicos via segmento dinâmico: `/api/ongs/[id]`.
- **Tipagem ponta a ponta:** entrada validada com Zod e tipos derivados do schema (`z.infer`), nunca `any`.
- **Toda rota nova ganha teste de integração** em `web/tests/integration/api/<recurso>/`.
- **Toda rota nova ganha requisição de exemplo** no Bruno (`bruno/<recurso>/`).

## 2. Camadas

Cada recurso se divide em três camadas, com responsabilidades separadas:

| Camada | Onde | Faz | Não faz |
|---|---|---|---|
| **Rota** (controller) | `api/<recurso>/route.ts` | autoriza, valida a entrada, chama o service, monta a resposta HTTP | acessar o Prisma diretamente |
| **Schema** | `schemas/<recurso>.schema.ts` | define com Zod o formato aceito de cada entrada | regras que dependem do banco |
| **Service** | `services/<recurso>/index.ts` | lê e grava no banco via Prisma; regras de negócio | conhecer `NextRequest`/`NextResponse` |

Regra principal: **a rota nunca importa o Prisma.** Se precisa de dado, pede ao service.

## 3. Ordem dentro de uma rota

1. **Autorização:** `blockForbiddenRequests(request, perfisPermitidos)`. Se retornar algo, devolva esse retorno (401 ou 403).
2. **Parâmetros da URL:** em Next 16, `params` é uma `Promise`. Sempre `const { id } = await params`.
3. **Validação da entrada:** corpo e parâmetros passam pelo schema com `safeParse`. Se falhar, `returnInvalidDataErrors(resultado.error)` (400).
4. **Regra de dono**, quando aplicável: um perfil comum só mexe nos próprios dados (`getUserFromRequest` para saber quem é).
5. **Service.**
6. **Resposta.**

Envolva tudo em `try/catch` e, no `catch`, use `zodErrorHandler(error)` (400 para erro de validação, 500 para o resto).

Exemplo de validação:

```ts
const resultado = idSchema.safeParse(id);
if (!resultado.success) {
  return returnInvalidDataErrors(resultado.error);
}
```

## 4. Formato das respostas

**Sucesso:** o próprio objeto (ou lista), sem envelope e sem `message`.

```json
{ "id": "…", "nome": "ONG Exemplo" }
```

**Erro:** objeto `error` com `message`; `details` é opcional (lista de erros por campo). Gerado por `toErrorMessage(message, details)`.

```json
{ "error": { "message": "Email inválido", "details": [{ "campo": "email", "message": "Email inválido" }] } }
```

| Status | Quando |
|---|---|
| 200 | leitura ou atualização OK |
| 201 | criação OK |
| 400 | entrada inválida |
| 401 | sem sessão |
| 403 | sessão sem permissão |
| 404 | recurso não existe |
| 409 | conflito (ex.: CNPJ já cadastrado) |
| 500 | erro inesperado |

> ⚠️ **O código herdado não segue esse formato à risca.** `blockForbiddenRequests`, `getUserFromRequest` e alguns retornos 403/409 usam `{ "error": "texto" }`, e o `POST /api/users` devolve `{ message, user }` no sucesso. Rotas novas seguem o formato acima; o código antigo será reescrito (ver [codigo-herdado.md](codigo-herdado.md)).

## 5. Utilitários disponíveis

Em `web/src/utils/api/server/` (importar de `@/utils/api/server`):

| Função | Uso |
|---|---|
| `blockForbiddenRequests(request, roles)` | exige sessão e, se `roles` for passado, um dos perfis |
| `getUserFromRequest(request)` | usuário da sessão com `role` (ou resposta 401) |
| `validBody(request)` | lê o JSON do corpo ⚠️ ver bug #10 em [erros-a-consertar.md](erros-a-consertar.md) |
| `returnInvalidDataErrors(zodError)` | resposta 400 padronizada a partir de um erro do Zod |
| `zodErrorHandler(error)` | para o `catch`: 400 se for Zod, 500 caso contrário |

E `toErrorMessage(message, details?)` em `@/utils/api/toErrorMessage`.

## 6. Autenticação nas rotas

- Operações de conta (login, cadastro, troca de senha e e-mail) passam pelo better-auth; ver [autenticacao.md](autenticacao.md).
- Os perfis permitidos por método ficam numa constante no topo da rota, tipada com `AllowedRoutes` (`@/types`):

```ts
const allowedRoles: AllowedRoutes = {
  GET: ["ADMIN"],
  PATCH: ["ADMIN", "ONG"],
};
```

Use sempre a chave do **mesmo método** da função (`allowedRoles.GET` dentro de `GET`). Errar isso já causou uma falha de segurança no código herdado (bug #2).
