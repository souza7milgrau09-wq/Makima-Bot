# M Discord Bot

Bot profissional para Discord com tres sistemas principais:

- Tickets inteligentes por tipo, palavras-chave e cargos permitidos.
- Ranking de tempo em call para staff, comunidade ou grupos personalizados.
- Sistema bancario com recompensas, cooldowns, loja, compras e perfil.

O prefixo padrao e `m`, entao `mdiario`, `msemanal`, `mticket abrir ...` e `mcallrank staff` funcionam.

## Requisitos

- Node.js 18.17 ou superior.
- Um bot criado no Discord Developer Portal.
- Intents ativadas no portal:
  - Server Members Intent
  - Message Content Intent
  - Presence nao e obrigatorio

## Instalar

```bash
npm install
```

Copie `.env.example` para `.env` e coloque o token:

```env
DISCORD_TOKEN=seu_token
BOT_PREFIX=m
DATA_DIR=./data
```

Inicie:

```bash
npm start
```

## Permissoes do bot

O bot precisa de permissoes para:

- Ler e enviar mensagens.
- Gerenciar canais.
- Ver canais de voz.
- Ler membros e cargos.
- Usar embeds.

Para tickets, coloque o cargo do bot acima dos cargos que ele vai liberar nos canais.

## Sistema 1: Tickets

O bot classifica o ticket lendo o motivo informado pelo membro e comparando com palavras-chave configuradas.
Cada tipo de ticket tem seus proprios cargos permitidos.

Tipos padrao:

- `parceria`: parceria, parceiro, divulgacao, collab.
- `suporte`: suporte, ajuda, erro, bug, problema.
- `denuncia`: denuncia, report, acusacao.

Comandos:

```text
mticket abrir quero fazer parceria com o servidor
mticket tipos
mticket assumir
mticket fechar resolvido
```

Configuracao:

```text
msetticket add parceria Parceria
msetticket cargos parceria @EquipeParceria
msetticket categoria parceria ID_DA_CATEGORIA
msetticket transcript parceria #logs-ticket
msetticket keywords parceria parceria collab divulgacao
```

Exemplo profissional:

```text
msetticket cargos parceria @Parcerias
msetticket cargos suporte @Suporte @Admin
msetticket cargos denuncia @Moderacao @Admin
```

Assim, um ticket classificado como parceria fica visivel apenas para o criador, o bot, administradores e cargos de parceria configurados.

## Sistema 2: Ranking de Call

O bot registra tempo em call enquanto esta online. Voce pode criar rankings separados:

- Staff.
- Comunidade inteira.
- Times.
- Funcoes especificas.
- Premiacoes de longo prazo.

Comandos:

```text
mcallrank staff
mcallrank comunidade 10
mcalltime
mcalltime @membro
```

Configuracao:

```text
msetcall add staff Staff
msetcall cargos staff @Staff @Moderador
msetcall canal staff #rank-staff
msetcall publicar staff
```

Para ranking de todos:

```text
msetcall add comunidade Comunidade
msetcall todos comunidade on
msetcall canal comunidade #rank-call
msetcall publicar comunidade
```

Observacao: se o bot ficar offline, ele nao consegue medir o tempo desse periodo. Para uso grande e competitivo, hospede o bot 24/7.

## Sistema 3: Banco, Loja e Perfil

Comandos dos membros:

```text
mdiario
msemanal
mmensal
mtrabalho
mbanco
mloja
mcomprar perfil-azul
musar perfil-azul
mperfil
```

Configuracao de economia:

```text
mseteconomia moeda coins
mseteconomia reward daily 500
mseteconomia reward weekly 2500
mseteconomia reward monthly 9000
mseteconomia reward workMin 120
mseteconomia reward workMax 420
```

Loja:

```text
mseteconomia item add perfil-preto 5000 Perfil Preto Elite
mseteconomia item remove perfil-preto
```

Os dados ficam salvos em `data/db.json`.

## Estrutura

```text
src/
  config/
    defaultGuildData.js
  core/
    commandRouter.js
    jsonDatabase.js
  modules/
    economy/
    tickets/
    voice/
  utils/
    format.js
    permissions.js
```

## Proximos upgrades recomendados

- Trocar JSON por SQLite ou Postgres se o bot crescer.
- Criar painel web para configurar cargos, tickets, loja e rankings.
- Adicionar botoes e menus do Discord para abrir tickets.
- Gerar transcript completo das mensagens do ticket.
- Criar cards de perfil com imagem usando Canvas.
- Automatizar publicacao do ranking de call por horario.
- Adicionar logs administrativos e protecao antifraude na economia.
