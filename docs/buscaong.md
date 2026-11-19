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

### 3.1 Tela principal: como está implementado

Protótipo P1 a P4 (a página da ONG e a denúncia estão na §3.2). Fica em `app/(frontend)/(landing-pages)/`; a página carrega as listas dos filtros no servidor e o resto acontece no navegador (`TelaMapa`).

**Layout:**
- **Celular (como o protótipo):** mapa em tela cheia; busca, engrenagem e chips por cima; a lista num painel que desliza (metade da tela ou aberto, pela alça).
- **Computador:** lista numa coluna de 400 px à esquerda (com a busca e os filtros) e o mapa ocupando o resto.

**Onde o mapa abre:** o navegador pede a localização. Aceitando, o mapa abre perto da pessoa e as distâncias são a partir dela ("perto de você"); negando, abre em São Paulo ("nesta região"). O botão de mira pede de novo.

**Mapa e lista são independentes** (como no protótipo):
- **Mapa** (`GET /api/ongs/mapa?bbox=`): pins das ONGs publicadas dentro da área visível, até 1.000. Pins próximos viram um círculo com a quantidade; tocar aproxima.
- **Lista** (`GET /api/ongs?lat=&lng=`): as 30 ONGs mais próximas do ponto de referência (a pessoa, o lugar buscado ou o centro de SP), até **50 km**, com o total. Separa as que estão fora da área do mapa ("toque para centralizar"). Mover o mapa não muda a lista; buscar um lugar muda.
- As duas consultas usam o índice `2dsphere` de `localizacaoPublica` (`$geoWithin` e `$geoNear`), criado pelo `pnpm db:seed`. O retângulo da tela vira um polígono com pontos intermediários nos lados norte e sul (no MongoDB os lados são arcos de círculo máximo, que em zoom de estado entortam vários km; os lados leste e oeste já são meridianos). Com o mapa bem afastado, a tela limita a área a ±180° e o servidor a divide em fatias de até 90° de longitude: um polígono maior que um hemisfério seria lido como o lado de fora dele.

**Busca "ONG ou bairro":** nomes de ONGs vêm do banco (`GET /api/ongs/busca?q=`, em todo o país); bairros, cidades e CEPs vêm da geocodificação do Mapbox (v6, no navegador, com o token público). Escolher uma ONG leva o mapa até ela; escolher um lugar enquadra o lugar e o torna o ponto de referência da lista. O resultado do Mapbox não é guardado, então a geocodificação comum ("temporária") é permitida; cada busca conta no limite gratuito do Mapbox.

**Filtros (P2):** causa, "tenho para doar" (itens da lista e, com borda tracejada, os itens livres mais usados pelas ONGs) e "quero ser voluntário" (dias D S T Q Q S S, turno e atividade). O painel mostra a contagem ao vivo ("Mostrar N ONGs") e só aplica no botão.
- Dentro de um grupo vale qualquer opção (OU); entre grupos, todas (E).
- Voluntariado: o **mesmo horário** precisa bater dia, turno e atividade. Sábado também encontra horários de "fim de semana" e "todo dia"; segunda a sexta, os de "dias úteis".
- Os filtros vão na URL das rotas como parâmetros repetidos (`?causa=animais&causa=idosos&item=fraldas&dia=SABADO`), definidos em `lib/mapa/filtros.ts`.

**Card contextual:** sem filtro, mostra os itens; com filtro de item ou de voluntariado, mostra em mel o item ("✓ Precisa de Fraldas") e o horário que bateram, mais "+ N outros itens". Tocar no card seleciona a ONG e mostra "Ver página da ONG" (§3.2).

**Urgência no mapa (§6):** ONG com item urgente tem o selo terracota "Urgente · Fraldas G" no card e o pin terracota; um grupo de pins com alguma ONG urgente ganha contorno terracota. A lista continua por distância.

**Estados vazios (P4):**
- Há resultados, mas nenhum na área do mapa: aviso sobre o mapa, com "Ver na lista" e "Ir para a mais próxima".
- Nenhum resultado com os filtros: a busca **não** é ampliada sozinha; a lista sugere qual filtro remover, com quantas ONGs apareceriam.

**Privacidade:** a área pública só vê e só consulta a **posição pública** (`localizacaoPublica`): a real, ou, para ONG com "mostrar só o bairro", um ponto **sorteado** a 150-400 m do endereço quando a localização é salva (gerador criptográfico, guardado no banco). Assim:
- a coordenada exata nunca sai da API e não dá para recalculá-la a partir de dados públicos (o desvio não depende do ID nem de nada visível);
- filtrar ou ordenar pela posição real deixaria descobrir o endereço encolhendo a área do mapa ou movendo o ponto de referência, então nenhuma consulta pública usa `localizacao`;
- ajustar o pin (até 1 km) mantém o desvio sorteado, e a posição pública só anda junto; sorteia de novo só quando a ONG liga "só o bairro" ou muda para longe (vários sorteios em volta do mesmo endereço permitiriam tirar a média).

ONGs salvas antes da posição pública existir a ganham no `pnpm db:seed`; até lá, não aparecem no mapa.

**Rotas públicas** (limite por IP): `GET /api/ongs` 60/min · `GET /api/ongs/mapa` 120/min · `GET /api/ongs/busca` 60/min. Só ONGs `PUBLICADA` aparecem.

### 3.2 Página da ONG (P5) e denúncia (P5.1): como está implementado

**Endereço:** `/ong/<slug>` (ex.: `/ong/casa-lar-esperanca`). O slug nasce ao publicar, a partir do nome público, e **não muda** se a ONG trocar de nome (links já divulgados continuam valendo). Repetido ganha `-2`, `-3`; nomes de rotas fixas (`cadastro`, `painel`...) são pulados. O ID também abre a página (`/ong/<id>`), para ONGs publicadas antes de existir slug; o `pnpm db:seed` cria o slug que faltar. Só ONG `PUBLICADA` abre; as outras dão 404.

**O que mostra**, de cima para baixo (Server Component, `app/(frontend)/ong/[slug]/`):
- Capa (ou o padrão listrado do protótipo), "←" (volta ao mapa como estava) e "Denunciar" discreto sobre a foto; logo ou iniciais.
- Nome, "causa · distância · bairro" e a descrição curta. A distância aparece quando a pessoa veio do mapa: o card manda `?de=lat,lng`, o mesmo ponto de onde a lista mede.
- **Urgente agora** (fundo terracota claro): cada item urgente com "há 2 h" e o detalhe.
- **Sempre precisa**: os outros itens (lista fixa primeiro, depois os livres).
- **Voluntariado** (horários e requisitos), **Sobre a ONG** e as outras causas.
- **Onde fica**: imagem do mapa (Static Images API do Mapbox, sem carregar o mapa interativo), o endereço e "Como chegar" (Google Maps). Quem mostra só o bairro aparece como uma área, sem pin e sem rua.
- **Barra de contato fixa** com até 2 botões, por prioridade: WhatsApp, e-mail, site, Instagram. O principal é o WhatsApp (sem ele, o e-mail). O que não cabe vira botão no fim da página (`lib/ong/contatos.ts`). Contato marcado como não visível não sai do servidor.

**Denúncia (P5.1):** "Denunciar" abre um formulário curto: motivo (obrigatório, lista fixa: fechou ou mudou, pediu dinheiro ou dados, não parece ONG, violência, conteúdo inadequado, outro), relato e e-mail opcionais. `POST /api/denuncias` (pública).
- Limite de **1 denúncia por perfil a cada 24 h por aparelho** (guardado no navegador) e por IP (no servidor, mais 10 por hora por IP no geral). Os dois são freios contra abuso, não garantias.
- "Violência verbal ou física" mostra 190 e Disque 100 na confirmação e vai para o topo da fila do admin.
- A denúncia não tira a ONG do ar: só entra na fila (A2). A ONG não vê quem denunciou; o e-mail de quem denunciou também não aparece para o admin (é usado só para avisar da decisão).

## 4. Cadastro da ONG (8 passos)

1. **CNPJ**, validado em três camadas, em ordem:
   1. **Dígito verificador**, localmente, sem rede.
   2. **Consulta à BrasilAPI**, com fallback para Minha Receita e OpenCNPJ (ver §8.4).
   3. **Situação cadastral ativa** e **natureza jurídica sem fins lucrativos** (grupo 3), **fora** das naturezas do grupo 3 que não são ONGs: cartório (303-4), condomínios (308-5 e 331-0), comissão de conciliação prévia (310-7), mediação e arbitragem (311-5), partido político e seus órgãos (312-3, 325-5 a 328-0), frente plebiscitária (329-8), sindicato (313-1), fundo privado (324-7) e plano de previdência complementar (332-8). Lista em `lib/cnpj/naturezas.ts`; a recusa usa o motivo `NATUREZA_NAO_ACEITA`.
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
  - responde `JA_CADASTRADO` sem consultar a Receita quando a ONG já está **publicada** (ou suspensa);
  - responde `EM_ANDAMENTO` (com os dados da Receita) quando há um cadastro começado e não publicado. A conta já existe, mas o perfil permanece como rascunho até aceitar os termos no passo 8;
  - responde `ELEGIVEL` ou `NAO_ELEGIVEL` (com o motivo) junto com os dados da Receita.
- Estados do campo: digitando, validando, válido, inválido, já cadastrado, em andamento, não elegível, não encontrado e erro (Receita indisponível ou limite atingido).
- **Cadastro em andamento:** a tela oferece "Continuar de onde parei" (vai para `/ong/cadastro/continuar`) e "Começar de novo" (exige entrar na própria conta e confirmar um código enviado ao e-mail já vinculado).
- O CNPJ validado fica na **sessionStorage** do navegador até a conta ser criada. Nada vai para o banco antes disso.
- "O endereço mudou" segue igual, mas grava `usarEnderecoReceita: false` (o endereço será pedido no passo 3).

**Passo 2, Criar acesso** (`/ong/cadastro/acesso`):
- E-mail, senha e confirmação da senha, com botão para mostrar o que foi digitado. A regra é 8+ caracteres, com maiúscula, minúscula e número; a tela marca os requisitos ao vivo e o servidor aplica a mesma regra. A confirmação é conferida só na tela.
- `POST /api/ongs` (pública, 5 tentativas por minuto por IP) revalida o CNPJ no servidor e só então cria o usuário (perfil `ONG`, e-mail não verificado) e a `Ong` em `RASCUNHO` com `passoAtual: 3`. Se a `Ong` falhar, o usuário é apagado (sem conta órfã).
- O better-auth envia um **código de 6 dígitos** por e-mail (Resend), válido por 10 minutos e guardado com hash. A tela tem 6 campos e reenvio depois de 60 s.
- Com o código confirmado, a sessão é criada e a pessoa segue para o passo 3.
- **Cadastros existentes são preservados:** `POST /api/ongs` nunca exclui nem substitui rascunhos, com uma exceção: o rascunho de uma conta que **nunca confirmou o e-mail** e foi criada há **mais de 1 hora** (`PRAZO_RASCUNHO_SEM_CONFIRMACAO_MS`). Sem e-mail confirmado não há login, então ele só tem os passos 1 e 2. O `GET /api/cnpj` já mostra esse CNPJ como livre, e o `POST` apaga a conta e o rascunho antigos (a condição vai no próprio `delete`: se a conta confirmar no meio do caminho, nada é apagado) e cria o cadastro novo. Rascunho sem conta também é liberado. `recomecar: true` é recusado com 400; o valor antigo `false` ainda é aceito por compatibilidade. Um CNPJ com rascunho responde 409 com `details.motivo: EM_ANDAMENTO`.

**Recomeçar com segurança** (`/ong/cadastro/reiniciar`):
- O acesso pelo CNPJ leva a `/ong/cadastro/continuar?reiniciar=1`: é preciso entrar na conta da ONG. Quem já entrou vai direto à confirmação.
- `POST /api/ongs/minha/reinicio/codigo` envia um código de seis dígitos para o e-mail da sessão, nunca para um endereço recebido no corpo. O better-auth armazena o hash; validade de dez minutos e três tentativas por código.
- `POST /api/ongs/minha/reinicio` exige `{ codigo, confirmar: true }`, sessão de ONG e origem igual à do site. O código é validado e consumido pelo better-auth; a identidade resultante precisa ser a mesma da sessão.
- Só os dados dos passos 3 a 7 são limpos. Conta, senha, e-mail, CNPJ e dados consultados na Receita são mantidos. A ONG volta ao passo 3, com opção de usar o endereço da Receita.
- A limpeza é condicional ao dono, status `RASCUNHO` e versão `updatedAt`. Publicação e salvamentos (do cadastro e do painel) usam a mesma proteção contra dados antigos, condicionada à situação lida. Se outra ação alterar o cadastro, responde 409 e pede recarregamento. Publicadas e suspensas não podem recomeçar.
- A troca de logo/capa continua sem apagar arquivos antigos do R2 (limpeza do bucket é pendência separada).

**Continuar o cadastro** (`/ong/cadastro/continuar`):
- E-mail e senha do passo 2. Com login certo, `/ong/cadastro/retomar` leva ao passo em que a pessoa parou (`passoAtual`).
- Se a pessoa saiu antes de confirmar o e-mail, o better-auth responde `EMAIL_NOT_VERIFIED` (só depois de conferir a senha). A tela manda um código novo e confirma ali mesmo; com o código, a sessão abre e o cadastro continua.
- Quem não lembra a senha segue para `/login/recuperar`: código por e-mail e nova senha, preservando o cadastro. Ao redefinir, as sessões anteriores são encerradas e a tela entra com a senha nova.
- Sem login, as páginas dos passos 3 a 8 levam para cá. O `/login` também tem o link "Continue de onde parou".

**Respostas de erro do `POST /api/ongs`:** 400 dados inválidos · 404 CNPJ não encontrado · 409 CNPJ ou e-mail já com conta (`details.campo`), ou cadastro em andamento (`details.motivo: EM_ANDAMENTO`) · 422 não elegível (`details.motivo`) · 429 limite · 503 Receita indisponível.

### 4.2 Passos 3 a 8: como está implementado

A partir do passo 3 a conta já existe, então **cada passo grava no banco** ao clicar em Continuar (o rascunho fica salvo). As páginas são Server Components que leem a ONG do usuário logado; o envio vai para `PUT /api/ongs/minha/<seção>`.

**Regras comuns:**
- Só a conta de perfil `ONG` mexe no próprio cadastro. As rotas agem sobre a ONG **do usuário da sessão**, sem ID na URL (assim não dependem do erro #5, sobre o formato de ID).
- `passoAtual` marca o passo mais adiantado liberado. Salvar o passo *n* libera o *n+1*; voltar e salvar de novo não reduz. Abrir um passo além do liberado redireciona para o primeiro que falta.
- Sem login, as páginas levam a `/ong/cadastro/continuar`; outro perfil vai para `/`. Depois de publicada, qualquer passo leva ao 8, que mostra o perfil publicado.
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
- Enquanto a ONG digita (3+ letras), `GET /api/itens-livres?q=` sugere itens livres que outras ONGs **publicadas** já usaram, com quantas ONGs usam (texto de rascunho ou de ONG suspensa não aparece). Limite de 60 consultas por minuto por conta (a tela espera a pessoa parar de digitar).

**Passo 6, Voluntariado (opcional):**
- Ligado, exige pelo menos um horário (até 20). Desligado, os horários ficam guardados, mas não aparecem.
- Cada horário tem dia (dias da semana, dias úteis, fim de semana ou todo dia), início e fim em horas cheias ou "horário livre", e atividade da lista fixa ou "Outra" com texto.
- Os **turnos** (manhã até 12h, tarde até 18h, noite depois) são calculados no servidor para o filtro de voluntariado. Horário livre conta nos três.
- A lista de atividades tem as três do protótipo e cinco provisórias (cozinha, limpeza e manutenção, cuidado com animais, apoio administrativo, eventos e campanhas), para revisar.

**Passo 7, Apresentação:**
- Nome público (a primeira sugestão é a razão social) e descrição curta (até 160 caracteres) são obrigatórios; "Sobre a ONG" é opcional.
- Logo (até 2 MB) e capa (até 5 MB) são opcionais, em JPG, PNG ou WebP, de qualquer formato e tamanho em pixels: as duas são cortadas no centro para caber no espaço (a logo vira quadrada). Aparecem no perfil na hora e entram na revisão da equipe (A5, §7.1). O navegador pede uma URL assinada (`POST /api/ongs/minha/imagens`) e envia o arquivo **direto para o Cloudflare R2**. Tipo e tamanho entram na assinatura, então o R2 recusa um arquivo diferente do declarado. Cada conta pede no máximo **20 URLs de envio por hora** (cada URL cria um arquivo novo no bucket, e os antigos não são apagados).
- O banco guarda a **chave** do arquivo (`ongs/<id>/logo-<uuid>.png`); o `PUT` só aceita chaves no formato exato que o envio gera para a própria ONG e o mesmo campo (`ongs/<id>/logo-<uuid>.<jpg|png|webp>`), sem `../` nem `?`; a imagem já salva continua valendo.
- Sem as variáveis `R2_*`, o envio aparece como indisponível e a ONG segue sem imagens.
- O bucket precisa de CORS liberando `PUT` a partir do domínio do site (e de `http://localhost:3000` em desenvolvimento).

**Passo 8, Prévia e publicar:**
- Mostra o card como vai aparecer no mapa e na lista (`components/ong/CartaoOng.tsx`) e a verificação do que está completo, com link para completar o que falta.
- Publicar exige aceitar os termos de uso (`/termos`, texto provisório). A publicação é imediata, sem aprovação manual. Se faltar algo, a API responde 422 com `details.pendencias`.
- ONG suspensa não publica (403). Publicar de novo não muda nada.
- Depois de publicar, a tela mostra "Perfil publicado!", o card e os botões "Ir para o painel" e "Ver a página da ONG". O e-mail com o link do perfil, previsto no protótipo, ficou fora.

**Erros das rotas `/api/ongs/minha/*`:** 400 dados inválidos ou opção/imagem que não existe (`details[].campo`) · 401 sem login · 403 outro perfil ou ONG suspensa · 404 conta sem ONG · 422 cadastro incompleto · 503 R2 não configurado (imagens).

## 5. Painel da ONG

- Gerenciar itens e marcar urgência.
- **Sem métricas** de alertas ou seguidores.

### 5.1 Como está implementado (O2)

`/ong/painel`, para a conta de perfil `ONG` com o perfil publicado ou suspenso. Sem login, vai para `/login`; cadastro não terminado, para o passo em que parou; admin, para `/admin`. O login (`/login`) leva direto ao painel.

| Seção | Rota | O que tem |
|---|---|---|
| Início | `/ong/painel` | link da página (copiar e abrir), urgências ativas, "Como aparece no mapa" e atalhos. Suspensa: o motivo da suspensão |
| Itens e urgência | `/ong/painel/itens` | tabela dos itens com "Marcar urgente", "Editar" e "Encerrar" (O3) e, abaixo, o formulário de causas e itens |
| Perfil público | `/ong/painel/perfil`, `/contatos`, `/localizacao` | apresentação (nome, descrição, logo e capa), contatos e endereço com o pin |
| Voluntariado | `/ong/painel/voluntariado` | horários e requisitos |

- **Os formulários são os mesmos do cadastro** (passos 3 a 7), em "modo painel" (`ModoPainel`, em `ong/cadastro/_components/modo.tsx`): sem título de passo nem "Voltar", o botão vira "Salvar alterações" e, ao salvar, a página fica onde está e avisa. As rotas são as mesmas `PUT /api/ongs/minha/<seção>`.
- Tirar um item da lista encerra a urgência dele.
- Moldura (`PainelShell`): barra lateral musgo-escuro no computador (como no protótipo O2), abas no topo no celular, e "Sair".

## 6. Urgência (apenas visual)

- **Selo** de urgência.
- **Pin terracota** no mapa.
- **Bloco de urgência** na página da ONG.
- **Nenhum envio de mensagens.**

### 6.1 Como está implementado (O3)

- A ONG marca um item dela (da lista ou livre) como urgente, com **detalhe** opcional (até 120 caracteres) e **prazo** de 3, 7 ou 14 dias (padrão 7). Depois do prazo o selo sai sozinho: quem lê compara `ate` com a hora atual, sem tarefa agendada. Dá para editar ou encerrar antes.
- **No máximo 5 itens urgentes ao mesmo tempo** (mais que isso e "urgente" deixa de dizer alguma coisa). ONG suspensa não marca.
- Guardado na própria ONG (`urgencias`: item, nome, detalhe, `criadaEm`, `ate`). O item é o slug da lista fixa ou `livre:<chave>` para item livre.
- `POST /api/ongs/minha/urgencias` (`{ item, detalhe, dias }`) marca ou remarca; `DELETE /api/ongs/minha/urgencias?item=` encerra. 422 com 5 ativas; 400 para item que a ONG não tem; 403 suspensa.
- Aparece no card e no pin do mapa (§3.1), no bloco "Urgente agora" da página (§3.2) e na coluna "Urgências" do admin (A1).

## 7. Admin

- **ONGs:** gestão das ONGs cadastradas.
- **Denúncias:** fila das denúncias de perfil.
- **Imagens:** revisão das logos e capas novas (a imagem aparece na hora; o admin dá "ok" depois).
- **Registro de ações:** log das ações administrativas.
- **Listas fixas:** listas de causas e itens usadas nos filtros e no cadastro.

### 7.1 Como está implementado (A1 a A5)

`/admin` é o login da equipe; as seções ficam em `/admin/ongs`, `/admin/denuncias`, `/admin/imagens`, `/admin/registro` e `/admin/listas`, com a barra escura do protótipo (visual neutro, sem o creme do site). **Contas de admin são criadas pelo terminal**, com `pnpm admin:criar` (e-mail, nome e senha; a senha segue a mesma regra e é gravada pelo better-auth). Uma conta de ONG não vira admin.

**A1, ONGs:** busca por nome, CNPJ ou cidade e filtros com contagem (todas, ativas, suspensas, CNPJ com problema, denunciadas, cadastro não terminado). "Revisar" marca a ONG com algum sinal. A ficha, à direita, tem:
- "Ver página pública" e "Abrir no WhatsApp"; contatos com copiar ou abrir, marcando o que é **interno** (e-mail de acesso) e o que está **oculto** na página;
- **Receita × declarado** (situação, natureza, cidade) e o botão **Revalidar**, que consulta o CNPJ de novo;
- **Sinais:** situação diferente de ativa, natureza que não pode se cadastrar (o filtro "CNPJ com problema" também pega), denúncias abertas por motivo, cidade declarada diferente da Receita e "a ONG disse que o endereço da Receita mudou" (o protótipo pede que isso vire sinal, sem bloquear);
- **Suspender** (sai do mapa na hora; a ONG recebe e-mail com o motivo; as denúncias abertas viram "com ação"), **Reativar** e **Excluir** (apaga a conta, o perfil e as denúncias; pede confirmação). Todas exigem motivo. O admin não edita perfis.

**A2, Denúncias:** abas Abertas, Arquivadas e Com ação. Denúncias da mesma ONG e motivo viram uma linha; vão para o topo as de violência e as que têm 3 ou mais em 7 dias. A linha abre os relatos, a ficha resumida e duas ações com motivo: **Suspender ONG** ou **Arquivar denúncia** (sem mexer na ONG). Quem denunciou e deixou e-mail recebe um aviso da decisão.

**A3, Registro de ações:** somente leitura (nenhuma linha se edita ou apaga). Busca, filtros (suspensões, exclusões, denúncias, listas, sistema) e **Exportar CSV** (`GET /api/admin/acoes`). Toda ação do admin vira uma linha com quem, o quê, o alvo (o nome como era na hora) e o motivo.

**A5, Imagens** (não está no protótipo): a logo e a capa aparecem no perfil assim que a ONG envia (sem moderação antes). A seção lista as imagens ainda não revisadas de perfis publicados, das mais antigas para as mais novas, e a barra mostra quantas são. **Ok** tira da lista (sem mexer no `updatedAt`, para não dar conflito no formulário da ONG); **Remover** exige motivo, tira a imagem do perfil, apaga o arquivo do R2 (o link antigo para de abrir), avisa a ONG por e-mail e vai para o registro. As duas valem só para a imagem que o admin viu: se a ONG trocou nesse meio-tempo, responde 409. Imagens salvas antes da revisão existir também entram na lista. Campos: `logoRevisada` e `capaRevisada` (ausente, `false` ou `null` = não revisada).

**A4, Listas:** causas, itens e atividades, com quantas ONGs usam cada opção.
- **Arrastar** (ou as setas, pelo teclado) muda a ordem dos filtros e do cadastro.
- **Editar:** renomear (o slug guardado nas ONGs não muda), grupo (só itens), desativar (some do cadastro e dos filtros, mas vale para quem já usa) e **unificar** com outra opção (as ONGs passam para a outra, inclusive as urgências, e esta sai da lista). Opção em uso não se exclui.
- **Sugestões do texto livre:** itens que as ONGs escreveram à mão, dos mais usados para os menos, com "Parecido com X" quando há um item próximo na lista. **Adicionar à lista** ou **Unificar** passam as ONGs para o item da lista (o filtro do mapa passa a encontrá-las); **Manter como texto livre** tira a sugestão.

**Rotas** (todas exigem perfil `ADMIN`; ID no formato de ObjectId): `PATCH` e `DELETE /api/admin/ongs/[id]`, `POST /api/admin/ongs/[id]/revalidacao`, `PATCH /api/admin/denuncias`, `POST /api/admin/listas`, `PATCH` e `DELETE /api/admin/listas/[id]`, `POST /api/admin/listas/[id]/unificacao`, `PUT /api/admin/listas/ordem`, `POST /api/admin/itens-livres`, `PATCH /api/admin/imagens`, `GET /api/admin/acoes`. Erros: 400 dados inválidos · 401/403 sessão · 404 não existe · 409 ação que não vale no estado atual (reativar ONG ativa, excluir opção em uso, nome repetido) · 503 Receita indisponível.

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
| @types/geojson | 7946.0.x | Os tipos do `mapbox-gl` usam o namespace global `GeoJSON`. Com o TypeScript 6 (`types` vazio por padrão), ele é incluído em `web/src/types/geojson.d.ts`, e o `web/tsconfig.json` liga `allowUmdGlobalAccess` | junto com o `mapbox-gl` |
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
| **Mapbox Static Images API** | imagem do endereço na página da ONG (P5) | ⚠️ não revalidado nesta sessão (conferir na página de preços do Mapbox) | — |
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

- **Moderação de imagem:** ✅ decidido em 2026-11-19: sem ferramenta automática e sem moderar antes. A imagem aparece na hora e a equipe revisa depois (A5, §7.1).
- **Telas de login:** o protótipo não tem. `/login`, `/login/recuperar` e `/admin` seguem o visual do site e do admin; revisar com o design.
- **Selo de CNPJ verificado:** exibir ou não.
- **Imagens trocadas no R2:** quando a ONG troca ou remove a logo ou a capa, o arquivo antigo continua no bucket. Falta uma limpeza (ex.: regra de ciclo de vida ou apagar ao salvar).
- **Representação da ONG:** reiniciar agora exige sessão e posse do e-mail já vinculado, mas o primeiro cadastro ainda não comprova que a pessoa representa a entidade. Ver junto com o selo de CNPJ verificado e o admin.
- **CNPJ preso por um rascunho sem e-mail confirmado:** ✅ decidido em 2026-11-19: depois de 1 hora sem confirmar o e-mail, o rascunho é substituído pelo próximo cadastro do mesmo CNPJ (§4.1).
- **Tempo de resposta do "esqueci a senha":** a resposta é a mesma com ou sem conta, mas quem tem conta espera o envio do e-mail (centenas de ms a mais). Baixa gravidade, porque o `POST /api/ongs` já diz quando um e-mail tem conta. Para fechar: enviar o e-mail em segundo plano (`advanced.backgroundTasks` do better-auth com o `after()` do Next).
- **Nomes das listas em cache por instância:** depois que o admin renomeia ou unifica uma opção (A4), as outras instâncias da Vercel mostram o nome antigo por até 5 minutos.
- **E-mail de quem denuncia não é confirmado:** dá para informar o e-mail de outra pessoa, que depois recebe o aviso da decisão (com o nome da ONG). Limitado a 10 denúncias por hora por IP, e o aviso só sai depois da decisão do admin.
- **Rascunhos abandonados:** ficam no banco até alguém continuar ou recomeçar. Apagar sozinho depois de um tempo (ex.: 30 dias, com cron da Vercel) foi deixado para depois.
- **Termos de uso:** o texto em `/termos` é provisório e precisa de revisão, inclusive jurídica.
- **Lista de atividades de voluntariado:** cinco das oito são provisórias (ver §4.2).
- **Ordenação por urgência:** o protótipo diz que a urgência muda "o selo, o pin e a ordenação", mas a lista P3 do próprio protótipo segue por distância. A lista continua por distância.
- **Revalidação automática do CNPJ:** o registro do protótipo (A3) mostra revalidações feitas pelo "sistema". Hoje só há o botão "Revalidar" na ficha (A1); revalidar todas periodicamente (cron da Vercel) fica para depois.
- **Terracota no admin:** o protótipo do admin usa terracota para alertas ("Revisar", a contagem de denúncias, "Excluir"), fora da regra de "só urgência" do site público. Foi mantido como no protótipo.
- **E-mails da equipe:** suspensão e reativação avisam a ONG; arquivar, suspender ou excluir avisam quem denunciou e deixou e-mail. O texto é provisório.
- **Limite de denúncias:** por aparelho (navegador) e por IP, em memória (cada instância da Vercel conta separado). Para algo global, usar um store compartilhado.
- **Grupo dos itens (A4):** campo novo, vazio nas listas do seed; o admin preenche.
- **Login com Google:** o botão (quebrado, erro #8) saiu da tela de login. Decidir se ONG e admin vão entrar com Google.
- **Raio e tamanho da lista:** 50 km e 30 ONGs foram escolhas iniciais. Revisar com dados reais (em cidade pequena, 50 km pode ser pouco; em SP, 30 pode ser pouco sem filtro).
- **Naturezas jurídicas do grupo 3 que não são ONGs:** ✅ decidido em 2026-11-19: cartório, condomínios, conciliação, mediação e arbitragem, partidos, frente plebiscitária, sindicato, fundo privado e previdência complementar são recusados (§4). Organização religiosa, comunidade indígena, serviço social autônomo (Sistema S), OS, Oscip e unidade executora continuam aceitos.
- **E-mail já cadastrado no passo 2:** hoje a resposta diz explicitamente que o e-mail já tem conta. Isso revela se um e-mail está cadastrado, mas só para quem tem um CNPJ elegível e ainda sem conta, e com limite de tentativas. A alternativa é uma mensagem genérica.
- **Cor de erro:** a paleta não tem cor de erro (terracota é só para urgência). Os erros de formulário usam borda `tinta` e texto neutro.

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
| `terracota-clara` | `#F6DED5` | fundo do bloco "Urgente agora" (P5) |
| `terracota-funda` | `#5C1E11` | texto sobre `terracota-clara` |
| `mel` | `#FBE9B7` | **"por que apareceu"** (motivo do resultado) |
| `mel-escuro` | `#4F3A00` | texto sobre mel |

Regra do design: musgo e creme dão conforto; **terracota só para urgência**; mel marca o motivo de cada resultado aparecer.

**Área admin** (visual neutro e denso, sem o creme do site; A1 a A4): `branco` `#FFFFFF` (cartões), `cinza-fundo` `#F4F5F3` (fundo), `cinza-cabecalho` `#F0F2EF` (cabeçalho de tabela), `cinza-linha` `#ECEEEB` (divisores), `cinza-borda` `#D9DDD9` (bordas e campos), `cinza-texto` `#5B655F` (texto secundário), `grafite` `#1C211E` (barra e botões escuros), `grafite-ativo` `#323A35` (aba ativa) e `grafite-texto` `#A5B0A9` (texto sobre grafite). O admin também usa terracota para alertas (ver §9).

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
