# BuscaONG

- **Nome do projeto e do site:** **BuscaONG**
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
3. Localização no mapa.
4. Contatos e redes sociais.
5. Causas e itens.
6. Horários de voluntariado.
7. Foto e descrição.
8. Prévia e publicar.

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
- E-mail, senha e confirmação da senha, com botão para mostrar o que foi digitado. A regra é 8+ caracteres, com maiúscula, minúscula e número; a tela marca os requisitos ao vivo e o servidor aplica a mesma regra. A confirmação é conferida só na tela.
- `POST /api/ongs` (pública, 5 tentativas por minuto por IP) revalida o CNPJ no servidor e só então cria o usuário (perfil `ONG`, e-mail não verificado) e a `Ong` em `RASCUNHO` com `passoAtual: 3`. Se a `Ong` falhar, o usuário é apagado (sem conta órfã).
- O better-auth envia um **código de 6 dígitos** por e-mail (Resend), válido por 10 minutos e guardado com hash. A tela tem 6 campos e reenvio depois de 60 s.
- Com o código confirmado, a sessão é criada e a pessoa segue para o passo 3.

**Respostas de erro do `POST /api/ongs`:** 400 dados inválidos · 404 CNPJ não encontrado · 409 CNPJ ou e-mail já com conta (`details.campo`) · 422 não elegível (`details.motivo`) · 429 limite · 503 Receita indisponível.

### 4.2 Passos 3 a 8: como está implementado

A partir do passo 3 a conta já existe, então **cada passo grava no banco** ao clicar em Continuar (o rascunho fica salvo). As páginas são Server Components que leem a ONG do usuário logado; o envio vai para `PUT /api/ongs/minha/<seção>`.

**Regras comuns:**
- Só a conta de perfil `ONG` mexe no próprio cadastro. As rotas agem sobre a ONG **do usuário da sessão**, sem ID na URL (assim não dependem do erro #5, sobre o formato de ID).
- `passoAtual` marca o passo mais adiantado liberado. Salvar o passo *n* libera o *n+1*; voltar e salvar de novo não reduz. Abrir um passo além do liberado redireciona para o primeiro que falta.
- Sem login, as páginas levam a `/login`; outro perfil vai para `/`. Depois de publicada, qualquer passo leva ao 8, que mostra o perfil publicado.
- O passo 3 não tem "Voltar": os passos 1 e 2 não se refazem depois que a conta existe.

| Passo | Tela | API | O que grava |
|---|---|---|---|
| 3 Localização | `/ong/cadastro/localizacao` | `PUT /api/ongs/minha/localizacao` | `endereco`, `localizacao` (ponto GeoJSON `[lng, lat]`), `mostrarSoBairro` |
| 4 Contatos | `/ong/cadastro/contatos` | `PUT /api/ongs/minha/contatos` | `contatos` (WhatsApp, e-mail, site, Instagram, cada um com `visivel`) |
| 5 Causas e itens | `/ong/cadastro/causas-itens` | `PUT /api/ongs/minha/causas-itens` | `causas`, `itens` (slugs das listas fixas), `itensLivres` |
| 6 Voluntariado | `/ong/cadastro/voluntariado` | `PUT /api/ongs/minha/voluntariado` | `aceitaVoluntarios`, `horariosVoluntariado` (com `turnos`), `requisitosVoluntariado` |
| 7 Apresentação | `/ong/cadastro/apresentacao` | `PUT /api/ongs/minha/apresentacao` e `POST /api/ongs/minha/imagens` | `nomePublico`, `descricaoCurta`, `sobre`, `logo`, `capa` |
| 8 Publicar | `/ong/cadastro/publicar` | `POST /api/ongs/minha/publicacao` | `status: PUBLICADA`, `publicadaEm`, `termosAceitosEm` |

**Passo 3, Localização:**
- O endereço vem da Receita (a menos que a ONG tenha dito no passo 1 que mudou) e pode ser editado. Endereço, bairro, CEP, cidade e UF são obrigatórios; número e complemento, opcionais.
- O pin começa na posição aproximada do endereço, calculada pelo **Nominatim** (OpenStreetMap) via `GET /api/geocodificacao`. Se não acha a rua, usa o centro da cidade. A ONG arrasta o pin (ou clica no mapa) até a entrada; o pin arrastado é o que vale.
- O mapa é o **Mapbox GL JS**. A geocodificação do Mapbox não é usada porque os termos dele **não permitem guardar** o resultado da geocodificação comum; a "permanente" exige cartão de crédito e é paga por consulta. O Nominatim permite guardar (dados ODbL, com atribuição) e é gratuito, com limite de 1 consulta por segundo: o servidor enfileira as chamadas, guarda as respostas em cache e limita a 10 consultas por minuto por conta. Não há autocompletar, que a política do Nominatim proíbe.
- Sem `NEXT_PUBLIC_MAPBOX_TOKEN`, a tela mostra "Mapa indisponível" e usa a posição calculada pelo endereço.
- "Mostrar só o bairro" só é guardado; o perfil público é que vai mostrar a área aproximada.
- A posição precisa estar dentro do retângulo do Brasil (pega latitude e longitude trocadas).

**Passo 4, Contatos:**
- Pelo menos WhatsApp ou e-mail, preenchido e visível.
- WhatsApp vira E.164 (`+5511971234567`) e tem o link "Testar no WhatsApp" (wa.me). Aceita celular e fixo (WhatsApp Business).
- Instagram aceita `@usuario` ou link e vira `@usuario`. Site ganha `https://` quando falta.
- O e-mail de acesso aparece como atalho ("Usar ..."). Desmarcar "Visível na página" não apaga o dado.

**Passo 5, Causas e itens:**
- 1 a 3 causas e pelo menos um item (da lista ou livre).
- As listas fixas ficam na coleção `opcao_lista` (modelo `OpcaoLista`, tipos `CAUSA`, `ITEM` e `ATIVIDADE`), preenchida por `pnpm db:seed` com as listas do protótipo. O admin vai gerenciá-las; a ONG guarda o `slug`, que não muda quando o nome muda.
- Item livre (até 20, de 2 a 40 caracteres) é guardado com o nome digitado e uma `chave` normalizada (minúsculas, sem acento). Se a chave bate com um item da lista, vira o item da lista.
- Enquanto a ONG digita (3+ letras), `GET /api/itens-livres?q=` sugere itens livres que outras ONGs já usaram, com quantas ONGs usam.

**Passo 6, Voluntariado (opcional):**
- Ligado, exige pelo menos um horário (até 20). Desligado, os horários ficam guardados, mas não aparecem.
- Cada horário tem dia (dias da semana, dias úteis, fim de semana ou todo dia), início e fim em horas cheias ou "horário livre", e atividade da lista fixa ou "Outra" com texto.
- Os **turnos** (manhã até 12h, tarde até 18h, noite depois) são calculados no servidor para o filtro de voluntariado. Horário livre conta nos três.
- A lista de atividades tem as três do protótipo e cinco provisórias (cozinha, limpeza e manutenção, cuidado com animais, apoio administrativo, eventos e campanhas), para revisar.

**Passo 7, Apresentação:**
- Nome público (a primeira sugestão é a razão social) e descrição curta (até 160 caracteres) são obrigatórios; "Sobre a ONG" é opcional.
- Logo (mín. 400 px de lado, até 2 MB) e capa (até 5 MB) são opcionais, em JPG, PNG ou WebP. O navegador pede uma URL assinada (`POST /api/ongs/minha/imagens`) e envia o arquivo **direto para o Cloudflare R2**. Tipo e tamanho entram na assinatura, então o R2 recusa um arquivo diferente do declarado.
- O banco guarda a **chave** do arquivo (`ongs/<id>/logo-<uuid>.png`); o `PUT` só aceita chaves com o prefixo da própria ONG.
- Sem as variáveis `R2_*`, o envio aparece como indisponível e a ONG segue sem imagens.
- O bucket precisa de CORS liberando `PUT` a partir do domínio do site (e de `http://localhost:3000` em desenvolvimento).

**Passo 8, Prévia e publicar:**
- Mostra o card como vai aparecer no mapa e na lista (`components/ong/CartaoOng.tsx`) e a verificação do que está completo, com link para completar o que falta.
- Publicar exige aceitar os termos de uso (`/termos`, texto provisório). A publicação é imediata, sem aprovação manual. Se faltar algo, a API responde 422 com `details.pendencias`.
- ONG suspensa não publica (403). Publicar de novo não muda nada.
- Depois de publicar, a tela mostra "Perfil publicado!" e o card. A tela de boas-vindas e o e-mail com o link do perfil, previstos no protótipo, ficaram fora desta entrega.

**Erros das rotas `/api/ongs/minha/*`:** 400 dados inválidos ou opção/imagem que não existe (`details[].campo`) · 401 sem login · 403 outro perfil ou ONG suspensa · 404 conta sem ONG · 422 cadastro incompleto · 503 R2 não configurado (imagens).

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
| Mapbox GL JS (`mapbox-gl`) | 3.34.1 | ^3.34.1 | — | Licença própria da Mapbox (não é open source); exige token. Usado no passo 3 do cadastro |
| AWS SDK S3 (`@aws-sdk/client-s3`, `s3-request-presigner`) | 3.1161.0 | ^3.1161.0 | — | Só no servidor, para as URLs assinadas do Cloudflare R2 (API compatível com S3) |

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
| **Nominatim** (OpenStreetMap) | endereço → coordenadas no cadastro (passo 3) | gratuito, **1 consulta/s**, sem autocompletar, User-Agent identificado | — (para volume maior, hospedar um Nominatim próprio) |
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

- **Moderação automática de imagem:** ferramenta ainda não escolhida. O protótipo prevê moderar antes de publicar; hoje as imagens do passo 7 vão direto para o R2 e aparecem no perfil.
- **Telas de login:** design pendente.
- **Tela de confirmação de denúncia:** design pendente.
- **Selo de CNPJ verificado:** exibir ou não.
- **Imagens trocadas no R2:** quando a ONG troca ou remove a logo ou a capa, o arquivo antigo continua no bucket. Falta uma limpeza (ex.: regra de ciclo de vida ou apagar ao salvar).
- **Endereço diferente do da Receita:** o protótipo prevê virar "sinal para a auditoria" do admin, sem bloquear. Não implementado (depende do admin).
- **Retomar o cadastro depois do login:** hoje o login leva para `/`. Quem sai no meio precisa abrir `/ong/cadastro/localizacao`, que leva ao passo que falta.
- **Termos de uso:** o texto em `/termos` é provisório e precisa de revisão, inclusive jurídica.
- **Lista de atividades de voluntariado:** cinco das oito são provisórias (ver §4.2).
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
6. **Marca:** o nome público passou a ser **BuscaONG** (antes era "perto", nome do protótipo em `design/`). A identidade visual (cores, fontes e o símbolo do pin, ver §11) continua a do protótipo.

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

- **Componente:** `web/src/components/base/brand/BuscaOngLogo.tsx`.
- **Marca (`BuscaOngMark`):** quadrado arredondado com um pin.
- **Logo completo (`BuscaOngLogo`):** a marca + o nome "BuscaONG" em Bricolage.
- **Variantes:** `light` (marca musgo e pin sálvia, para fundo claro) e `dark` (marca sálvia e pin musgo-escuro, para fundo escuro).
- **Favicon:** `web/src/app/icon.svg`, o mesmo desenho em SVG.
