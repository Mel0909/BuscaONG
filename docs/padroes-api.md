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
| `exigirSessaoOng(request)` | exige a sessão de uma conta `ONG` e devolve `{ userId, email }` (ou a resposta 401/403, no formato novo) |
| `exigirSessaoAdmin(request)` | o mesmo para o perfil `ADMIN`; devolve `{ id, email }` |
| `rateLimit(chave, { limit, windowMs })` + `tooManyRequests(s)` | limite simples em memória por chave (IP ou usuário) |
| `getUserFromRequest(request)` | usuário da sessão com `role` (ou resposta 401) |
| `validBody(request)` | lê o JSON do corpo ⚠️ ver bug #10 em [erros-a-consertar.md](erros-a-consertar.md) |
| `returnInvalidDataErrors(zodError)` | resposta 400 padronizada a partir de um erro do Zod |
| `zodErrorHandler(error)` | para o `catch`: 400 se for Zod, 500 caso contrário |

E `toErrorMessage(message, details?)` em `@/utils/api/toErrorMessage`.

**Rotas do cadastro da ONG** (`api/ongs/minha/*`): todas seguem o mesmo roteiro (sessão de ONG → corpo validado → service), montado por `rotaDoCadastro(schema, service)` em `api/ongs/minha/_utils/rotaDoCadastro.ts`, que também traduz os erros dos services em respostas HTTP. Agem sempre sobre a ONG do usuário da sessão, nunca sobre um ID vindo da requisição.

**Rotas do admin** (`api/admin/*`): montadas por `rotaAdmin(schema, acao)` em `api/admin/_utils/rotaAdmin.ts` (sessão de admin → ID da URL, se houver, validado como ObjectId → corpo validado → service), que também traduz os erros dos services do admin. Toda ação que muda algo exige motivo e é registrada (`registrarAcao`).

**IDs do MongoDB:** documentos criados pelo Prisma (ONG, denúncia, opção de lista) têm ID ObjectId (24 caracteres hexadecimais) e são validados com `objectIdSchema`. O `idSchema` (UUID) não serve para eles (erro #5).

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

### Rotas de usuários

As rotas reescritas `/api/users` e `/api/users/[id]` consultam a sessão com `auth.api.getSession({ headers: request.headers })` e verificam o perfil explicitamente. A listagem exige `ADMIN`; leitura, atualização e exclusão individuais permitem `ADMIN` ou a própria conta `ONG`. Sessão e permissão são verificadas antes do acesso ao banco. As respostas de erro dessas rotas seguem `{ error: { message } }`.

O `idSchema` valida **IDs de conta** do better-auth: exatamente 32 caracteres alfanuméricos, sem conversão nem mudança das contas existentes. IDs de ONG são ObjectIds do MongoDB e não usam esse schema. As subrotas de e-mail e senha ainda são herdadas e têm pendências no bug #6.

### Recuperação e reinício

`POST /api/password/forgot` é público e aceita `{ email }`; a resposta de solicitação é sempre neutra para não enumerar contas. `POST /api/password/reset` aceita `{ email, codigo, newPassword }` e valida a política antes do service better-auth. Nenhuma dessas rotas escreve credenciais pelo Prisma.

`POST /api/ongs/minha/reinicio/codigo` aceita `{}` e `/reinicio` aceita `{ codigo, confirmar: true }`. Exigem sessão ONG e header `Origin` igual à origem da requisição. Não aceitam IDs, CNPJ ou e-mail como alvo. O service resolve a ONG pela sessão e só limpa rascunho após confirmar posse do e-mail.

Os salvamentos e a publicação do cadastro usam comparação com o `updatedAt` lido, além do dono e da situação lida (rascunho, publicada ou suspensa: o painel edita a ONG publicada pelos mesmos passos). Conflitos com outra gravação/reinício/publicação devolvem 409; nunca reaplicar automaticamente uma operação destrutiva sobre a versão nova.
