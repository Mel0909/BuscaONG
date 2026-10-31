# BuscaONG

- **Nome interno do repositório:** BuscaONG
- **Nome público da marca (visível no site):** **perto**
- **Estrutura:** o app roda em `web/`; a raiz do monorepo cuida só de ferramentas compartilhadas

> Versões e preços revalidados em **2026-10-02**. As versões vêm do registro do npm (`npm view`) e da agenda oficial do Node.js. Os preços vêm das páginas oficiais de cada serviço, exceto a Brevo (ver §8.3).

## 1. Visão geral

O BuscaONG conecta doadores a ONGs próximas. Tem um **mapa** (Mapbox) e uma **lista sincronizada** de ONGs, com filtros por causa, item e voluntariado, e destaque visual para pedidos urgentes.

- **Não há conta de doador:** quem doa usa o site como visitante.
- **O site não envia notificações:** nem WhatsApp, nem e-mail, nem push. A urgência é só visual.

## 2. Perfis de usuário

| Perfil | Acesso | Conta |
|---|---|---|
| Visitante | área pública | não tem |
| ONG | `/ong` (self-service) | sim, criada no cadastro da ONG |
| Admin | `/admin` | sim |

## 3. Área pública

- **Mapa por viewport:** mostra as ONGs dentro da área visível. O raio **não** amplia sozinho quando há poucos resultados.
- **Lista independente do mapa:** a lista não depende do viewport do mapa.
- **Filtros:** causa, item, voluntariado e texto livre.
- **Card contextual** da ONG.
- **Engrenagem "Para ONGs":** ponto de entrada da área da ONG.
- **Barra de contato fixa.**
- **Denúncia de perfil:** o visitante pode denunciar o perfil de uma ONG.

## 4. Cadastro da ONG (8 passos)

1. **CNPJ**, validado em três camadas, em ordem:
   1. **Dígito verificador**, localmente, sem rede.
   2. **Consulta à BrasilAPI**, com fallback para Minha Receita e OpenCNPJ (ver §8.4).
   3. **Situação cadastral ativa** e **natureza jurídica sem fins lucrativos**.
2. Criar acesso (login da ONG).
3. Localização.

### 4.1 Passos 1 e 2: como está implementado

**Passo 1, CNPJ** (`/ong/cadastro`):
- O campo aplica a máscara e valida o dígito verificador no navegador (`utils/validations/cnpj.ts`), inclusive o **CNPJ alfanumérico** (válido desde jul/2026): mesmo módulo 11, com cada caractere valendo o código ASCII menos 48.
- Com 14 caracteres válidos, consulta `GET /api/cnpj/[cnpj]`. A rota:
  - é pública, com limite de 20 consultas por minuto por IP;
  - responde `JA_CADASTRADO` sem consultar a Receita quando o CNPJ já tem conta;
  - responde `ELEGIVEL` ou `NAO_ELEGIVEL` (com o motivo) junto com os dados da Receita.
- Estados do campo: digitando, validando, válido, inválido, já cadastrado, não elegível, não encontrado e erro (Receita indisponível ou limite atingido).
- O CNPJ validado fica na **sessionStorage** do navegador até a conta ser criada. Nada vai para o banco antes disso.
- "O endereço mudou" segue igual, mas grava `usarEnderecoReceita: false` (o endereço será pedido no passo 3).

**Passo 2, Criar acesso** (`/ong/cadastro/acesso`):
- E-mail e senha. A regra é 8+ caracteres, com maiúscula, minúscula e número; a tela marca os requisitos ao vivo e o servidor aplica a mesma regra.
- `POST /api/ongs` (pública, 5 tentativas por minuto por IP) revalida o CNPJ no servidor e só então cria o usuário (perfil `ONG`, e-mail não verificado) e a `Ong` em `RASCUNHO` com `passoAtual: 3`. Se a `Ong` falhar, o usuário é apagado (sem conta órfã).
- O better-auth envia um **código de 6 dígitos** por e-mail (Resend), válido por 10 minutos e guardado com hash. A tela tem 6 campos e reenvio depois de 60 s.
- Com o código confirmado, a sessão é criada e a pessoa segue para o passo 3, que por enquanto só avisa que o acesso foi criado.

**Respostas de erro do `POST /api/ongs`:** 400 dados inválidos · 404 CNPJ não encontrado · 409 CNPJ ou e-mail já com conta (`details.campo`) · 422 não elegível (`details.motivo`) · 429 limite · 503 Receita indisponível.
4. Contatos e redes sociais.
5. Causas e itens.
6. Horários de voluntariado.
7. Foto e descrição.
8. Prévia e publicar.

## 5. Painel da ONG

- Gerenciar itens e marcar urgência.
- **Sem métricas** de alertas ou seguidores.

## 6. Urgência (apenas visual)

- **Selo** de urgência.
- **Pin terracota** no mapa.
- **Bloco de urgência** na página da ONG.
- **Nenhum envio de mensagens.**

## 7. Admin

- **ONGs:** gestão das ONGs cadastradas.
- **Denúncias:** fila das denúncias de perfil.
- **Registro de ações:** log das ações administrativas.
- **Listas fixas:** listas de causas e itens usadas nos filtros e no cadastro.

## 8. Stack técnica

### 8.1 App

| Tecnologia | Versão estável atual | Versão no repo hoje | Node exigido | Observações |
|---|---|---|---|---|
| Next.js | **16.3.8** | 16.2.10 | `>=20.9.0` | Linha 16 é LTS. Peer: `react ^18.2 \|\| ^19` |
| eslint-config-next | **16.3.8** | 16.2.1 | — | Peer: `eslint >=9`, `typescript >=3.3.1` |
| React / React DOM | **19.3.0** (09/09/2026) | 19.2.0 | — | Última da linha 19.2: **19.2.8**. ⚠️ ver §10 |
| Prisma / @prisma/client | **6.19.3** (linha 6) | 6.19.1 | `>=18.18` | ⚠️ ver nota abaixo |
| better-auth | **1.7.7** | ^1.5.5 | — | Última da linha 1.6: **1.6.33**. Peers: `next ^14\|\|^15\|\|^16`, `prisma`/`@prisma/client ^5\|\|^6\|\|^7`. ⚠️ ver §10 |
| Mapbox GL JS | — | não instalado | — | Ver §9 |

O TypeScript e as demais ferramentas de desenvolvimento estão na §8.1.1.

### 8.1.1 Ferramentas de desenvolvimento (raiz)

Atualizadas na Etapa 4 (revalidadas em 2026-10-30). Ficam no `package.json` da raiz.

| Ferramenta | Versão | Por que essa e não a mais nova | Quando revisar |
|---|---|---|---|
| pnpm (`packageManager`) | 10.34.9 | As linhas 11 e 12 existem, mas trocar o gerenciador de pacotes muda o lockfile e exige o time e a Vercel na mesma versão | migração própria, quando o time quiser |
| TypeScript | 6.0.3 | O TS 7 (latest) não expõe a API JS que o Next usa por padrão (só com `experimental.useTypeScriptCli`) | quando o Next suportar o TS 7 sem flag |
| ESLint | 9.39.5 | **O ESLint 10 quebra o lint:** o `eslint-plugin-react` (usado pelo `eslint-config-next`, até a 16.4.3) trava, e `react`, `import` e `jsx-a11y` não declaram suporte ao 10. A linha 9 está marcada como sem suporte, então o install mostra um aviso de deprecated | quando o `eslint-config-next` e o `eslint-plugin-react` suportarem o 10 |
| @types/node | 24.19.x | Alinhado ao Node 24 do `engines`, não ao 26 | ao subir o `engines` |
| Vitest + @vitest/coverage-v8 | 5.0.5 | — | — |
| Vite | 8.3.5 | Dependência explícita para fixar o Vite usado pelo Vitest e exigido pelo `@vitejs/plugin-react` 6 | — |
| @vitejs/plugin-react | 6.1.2 | — | — |
| jsdom | 29.1.1 | O jsdom 30 exige Node ≥ 24.15, acima do `engines` (≥ 24) | ao subir o `engines` para ≥ 24.15 |
| @playwright/test | 1.64.1 | — (navegadores: `pnpm --filter web exec playwright install`) | — |
| Testing Library (dom / react / jest-dom) | 10.4.2 / 16.3.3 / 7.0.1 | Não usados pelos testes atuais (ambiente `node`); mantidos para testes de componente | — |
| @types/react / @types/react-dom | 19.2.18 / 19.2.7 | Acompanham a linha do React (19.2) | junto com o React, na Etapa 5 |
| commitlint, husky | 21.2.4, 9.1.7 | — | — |

**Removido:** `vite-tsconfig-paths`. Era redundante, porque os aliases já estão no `vitest.config.mts`, e dependia do `tsconfck` 3.1.6 (deprecated), que só declara suporte ao TypeScript 5.

**Prisma e MongoDB:**
- O **Prisma 7 não suporta MongoDB**.
- O Prisma 8 traz MongoDB de volta, mas ainda é release candidate e exige Node `>=22.18`.
- Por isso o BuscaONG fica na **linha 6 (6.19.x)**.
- ⚠️ A tag `latest` do pacote `prisma` no npm aponta para **`8.0.0-rc.19`**. Instalar o Prisma sem versão explícita traz o RC. Sempre fixe `^6.19` ou `~6.19`.

**Autenticação:**
- O better-auth substitui o Auth.js/NextAuth, que está em modo de manutenção desde set/2025.
- Como não há conta de doador, a auth serve só para **ONG e Admin**.

### 8.2 Node.js

| Linha | Status em 2026-10-02 | Fim do suporte |
|---|---|---|
| 20 | **EOL** desde 30/04/2026 | — |
| 22 | Maintenance LTS | 30/04/2027 |
| **24** (escolhido, `engines >=24`) | Active LTS até **20/10/2026**, depois Maintenance | 30/04/2028 |
| 26 | Current; vira LTS em **28/10/2026** | 30/04/2029 |

Todos os pacotes da tabela §8.1 aceitam Node 24 (o mínimo mais alto é o do Next, `>=20.9`).

### 8.3 Serviços externos

| Serviço | Uso | Tier gratuito atual | Depois do gratuito |
|---|---|---|---|
| **Mapbox GL JS** | mapa | **50.000 map loads/mês** (sem mudança) | US$ 5,00 por 1.000 loads (50k–100k), com faixas decrescentes |
| **Resend** | e-mail transacional (login, reset de senha) | **3.000 e-mails/mês, limite de 100/dia**, 3 domínios | Pro: US$ 20/mês (50.000 e-mails) |
| **Brevo** | alternativa ao Resend | **300 e-mails/dia** (~9.000/mês), contatos ilimitados — ⚠️ revalidado só parcialmente (ver abaixo) | a partir de ~US$ 9/mês (5.000 e-mails) |
| **Cloudflare R2** | armazenamento de fotos das ONGs | **10 GB-mês**, 1 mi operações Classe A, 10 mi Classe B, **egress grátis** | US$ 0,015/GB-mês; US$ 4,50/mi Classe A; US$ 0,36/mi Classe B |
| **Vercel** | hospedagem do app | não revalidado nesta sessão | — |
| **MongoDB Atlas** | banco de dados | não revalidado nesta sessão | — |

⚠️ **Brevo:** a página oficial de preços é renderizada via JavaScript e não pôde ser lida. Os 300 e-mails/dia aparecem nas páginas de produto do próprio brevo.com, mas o preço pago vem de fontes de terceiros. Confirmar em https://www.brevo.com/pricing/ antes de decidir.

O limite de 100 e-mails/dia do Resend pode apertar em picos de cadastro de ONGs, mas cobre o uso inicial.

### 8.4 Consulta de CNPJ

Os três endpoints foram testados nesta sessão e responderam 200, sem autenticação:

| API | Endpoint | Papel |
|---|---|---|
| BrasilAPI | `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` | principal |
| Minha Receita | `https://minhareceita.org/{cnpj}` | fallback 1 (mesmo formato de resposta da BrasilAPI) |
| OpenCNPJ | `https://api.opencnpj.org/{cnpj}` | fallback 2 (formato diferente) |

Campos para a validação do passo 1:
- **Situação:**
  - BrasilAPI e Minha Receita: `descricao_situacao_cadastral` (`"ATIVA"`) e `situacao_cadastral` (`2` = ativa).
  - OpenCNPJ: `situacao_cadastral` (`"Ativa"`).
- **Natureza jurídica:**
  - BrasilAPI e Minha Receita: têm `codigo_natureza_juridica`. Na tabela da Receita, o grupo **3xxx = entidades sem fins lucrativos** (ex.: 3999 associação privada, 3069 fundação privada).
  - OpenCNPJ: também traz `codigo_natureza_juridica` (como texto, ex.: `"3999"`), revalidado em 2026-10-30. O código é o mesmo nas três APIs.
- **CNPJ alfanumérico:** BrasilAPI e Minha Receita já aceitam o formato (respondem "não encontrado" para `12ABC34501DE35`, e não "inválido").

Implementação: `web/src/lib/cnpj/` (`lookupCnpj`, timeout de 5 s por API, mesma estrutura de dados para as três).

### 8.5 Infraestrutura

- **Hospedagem:** Vercel (app Next.js) + MongoDB Atlas (banco).
- **Imagens:** Cloudflare R2.

## 9. Decisões em aberto

- **Moderação automática de imagem:** ferramenta ainda não escolhida.
- **Telas de login:** design pendente.
- **Tela de confirmação de denúncia:** design pendente.
- **Selo de CNPJ verificado:** exibir ou não.
- **`mapbox-gl`:** entra como dependência agora ou só quando a feature do mapa for implementada? **Decisão adiada.**
- **Naturezas jurídicas do grupo 3 que não são ONGs:** a regra aceita todo o grupo 3, que também inclui serviço notarial (cartório, 303-4), condomínio edilício (308-5), entidade sindical (313-1) e órgãos de partido político (325-5 a 328-0), conforme a [tabela de natureza jurídica do IBGE/Concla](https://concla.ibge.gov.br/estrutura/natjur-estrutura/natureza-juridica-2021). Decidir se esses códigos devem ser recusados.
- **E-mail já cadastrado no passo 2:** hoje a resposta diz explicitamente que o e-mail já tem conta. Isso revela se um e-mail está cadastrado, mas só para quem tem um CNPJ elegível e ainda sem conta, e com limite de tentativas. A alternativa é uma mensagem genérica.
- **Cor de erro:** a paleta não tem cor de erro (terracota é só para urgência). Os erros de formulário usam borda `tinta` e texto neutro.
- **Conta com e-mail não confirmado:** se a pessoa fechar o navegador antes de digitar o código, a conta existe, mas o login exige e-mail verificado. Falta o fluxo de "entrar e confirmar o e-mail" ou de recuperar o acesso.

## 10. Pontos sinalizados nesta revalidação

O que mudou em relação aos alvos combinados antes ou merece atenção:

1. **React:** o alvo combinado era 19.2.x, mas a versão estável atual é **19.3.0** (lançada em 09/09/2026). Ficar em 19.2.8 é seguro; a 19.3 é um minor e o Next 16.3.8 aceita `^19`. Decidir na Etapa 5.
2. **better-auth:** o alvo combinado era 1.6.x, mas a versão estável atual é **1.7.7**. A linha 1.6 ainda recebe correções (1.6.33). Decidir na Etapa 5.
3. **Prisma:** a tag `latest` aponta para o RC do Prisma 8 (ver §8.1). Sempre instalar com a versão fixada.
4. **Node 24** entra em Maintenance LTS em 20/10/2026, e o Node 26 vira LTS em 28/10/2026. `engines >=24` continua válido; não é preciso mudar agora.
5. **Escopo:** em relação ao plano inicial, saíram os **alertas via WhatsApp** (e o toggle de custo no admin) e a **conta opcional de doador**. Urgência agora é só visual, e a auth atende só ONG e Admin.
6. **Marca:** a identidade do **perto** já foi aplicada (ver §11): metadata, navbar, login, cadastro e 404. Só o título da home ainda diz "BuscaONG", porque o Hello World combinado para a Etapa 5 é "Hello World — BuscaONG".

## 11. Identidade visual

Extraída do protótipo [design/Mapa de ONGs.dc.html](../design/Mapa%20de%20ONGs.dc.html) e aplicada em `web/src/app/globals.css` (tokens do Tailwind 4 em `@theme`).

### Cores

| Token (`bg-*`, `text-*`, `border-*`) | Hex | Papel |
|---|---|---|
| `creme` | `#F6F3EA` | fundo da página |
| `papel` | `#FFFDF8` | cards; texto sobre fundo escuro |
| `borda` | `#DCD5C4` | bordas e divisores |
| `borda-suave` | `#E3DED0` | borda de cartões |
| `tinta` | `#1F2B24` | texto principal; fundos escuros |
| `tinta-suave` | `#5E6B62` | texto secundário |
| `musgo` | `#2E5E45` | **ação** (botões, links) |
| `musgo-escuro` | `#1F4232` | hover, borda de botão, fundo escuro |
| `musgo-claro` | `#4E7A62` | passo concluído (sobre musgo-escuro) |
| `musgo-linha` | `#4E6E5D` | contorno e trilho sobre musgo-escuro |
| `salvia` | `#DDE7D6` | **superfície** |
| `salvia-clara` | `#EEF2E8` | superfície suave (avisos) |
| `salvia-apagada` | `#A9BFAF` | texto sobre fundo escuro |
| `salvia-media` | `#D2E0D5` | texto de passo concluído (sobre musgo-escuro) |
| `terracota` | `#B9472F` | **só para urgência** (selo, pin) |
| `terracota-escura` | `#8A2F1C` | texto de urgência |
| `mel` | `#FBE9B7` | **"por que apareceu"** (motivo do resultado) |
| `mel-escuro` | `#4F3A00` | texto sobre mel |

Regra do design: musgo e creme dão conforto; **terracota só para urgência**; mel marca o motivo de cada resultado aparecer.

### Tipografia

| Uso | Fonte | Classe |
|---|---|---|
| Texto (padrão) | Figtree 400–700 | `font-sans` |
| Títulos e marca | Bricolage Grotesque 500–700 | `font-display` |
| URLs, códigos | IBM Plex Mono 400–500 | `font-mono` |

As fontes são carregadas via `next/font/google` em `web/src/app/layout.tsx`. Todas são Google Fonts com licença OFL.

### Logo

- **Componente:** `web/src/components/base/brand/PertoLogo.tsx`.
- **Marca (`PertoMark`):** quadrado arredondado com um pin.
- **Logo completo (`PertoLogo`):** a marca + a palavra "perto" em Bricolage.
- **Variantes:** `light` (marca musgo e pin sálvia, para fundo claro) e `dark` (marca sálvia e pin musgo-escuro, para fundo escuro).
- **Favicon:** `web/src/app/icon.svg`, o mesmo desenho em SVG.
