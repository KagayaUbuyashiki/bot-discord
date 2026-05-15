# Free Stalkers Bot

Bot do Discord que opera como sistema de tickets para relatórios de missão. Quando um stalker clica no botão "Abrir Relatório", o bot cria um canal privado e conduz uma conversa estruturada, depois envia tudo via webhook para o PDA Free Stalkers.

## Stack

- Node.js 20+
- TypeScript
- discord.js v14

## Setup local

```bash
cd bot
cp .env.example .env
# preenche o .env com as variáveis (ver guia BOT-DISCORD.md na raiz do PDA)
npm install
npm run dev
```

## Deploy (Railway)

1. Sobe esta pasta `bot/` para um repositório novo no GitHub
2. https://railway.app → **New Project → Deploy from GitHub repo**
3. Aba **Variables** → adiciona todas as variáveis do `.env.example`
4. Railway detecta Node automaticamente, builda com `npm run build` e roda `npm start`

## Comandos

- `/setup-painel` — (admin) posta o embed com o botão "Abrir Relatório" no canal atual

## Fluxo

```
Stalker clica botão
  → bot cria canal #relatorio-username (categoria configurável)
  → bot pergunta: Steam ID, status, missão, relato, dificuldade, mutantes, observações, anexos
  → bot mostra resumo + botões Enviar/Cancelar
  → ao enviar: POST autenticado pro PDA
  → canal apagado após 30s
```

## Segurança

- O token do Discord nunca aparece em código
- Webhook autenticado via `x-webhook-secret` (mesmo segredo configurado no Vercel)
- Canais de ticket criados com `@everyone DENY view` — só o autor + role autorizada veem

## Estrutura

```
src/
├── index.ts                  # entry, login, handlers de eventos
├── config.ts                 # leitura de env vars
├── commands/
│   └── setup-painel.ts       # comando /setup-painel
└── tickets/
    ├── state.ts              # Map<channelId, TicketState>
    ├── flow.ts               # perguntas e fluxo conversacional
    └── submit.ts             # POST consolidado pro PDA
```
