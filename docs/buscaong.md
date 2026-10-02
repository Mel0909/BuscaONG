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
| TypeScript | 7.0.2 (latest) · **6.0.3** (linha 6) | ^5 | — | O TS 7 não tem a API JS que o Next usa por padrão; com Next 16.3 use TS 6 (o TS 7 só com `experimental.useTypeScriptCli`) |
| Mapbox GL JS | — | não instalado | — | Ver §9 |

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
  - OpenCNPJ: traz só a descrição em `natureza_juridica`, sem código. O fallback para ela precisa mapear pelo texto.

### 8.5 Infraestrutura

- **Hospedagem:** Vercel (app Next.js) + MongoDB Atlas (banco).
- **Imagens:** Cloudflare R2.

## 9. Decisões em aberto

- **Moderação automática de imagem:** ferramenta ainda não escolhida.
- **Telas de login:** design pendente.
- **Tela de confirmação de denúncia:** design pendente.
- **Selo de CNPJ verificado:** exibir ou não.
- **`mapbox-gl`:** entra como dependência agora ou só quando a feature do mapa for implementada? **Decisão adiada.**

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
| `tinta` | `#1F2B24` | texto principal; fundos escuros |
| `tinta-suave` | `#5E6B62` | texto secundário |
| `musgo` | `#2E5E45` | **ação** (botões, links) |
| `musgo-escuro` | `#1F4232` | hover, borda de botão, fundo escuro |
| `salvia` | `#DDE7D6` | **superfície** |
| `salvia-clara` | `#EEF2E8` | superfície suave (avisos) |
| `salvia-apagada` | `#A9BFAF` | texto sobre fundo escuro |
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
