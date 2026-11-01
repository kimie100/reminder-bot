# Telegram Reminder Bot

A minimal Telegram bot for scheduling reminders: `/remind 30m fix bugs`, `/list`, `/done`, `/cancel`. Built with Node.js + TypeScript, persists to SQLite, fires reminders on time via a 15-second scheduler.

## Create your bot (one time)

1. Open Telegram → search **@BotFather**
2. Send `/newbot`
3. Choose a display name (e.g. "Simple Reminder Bot")
4. Choose a username ending in `bot` (e.g. `simple_reminder_bot`)
5. Copy the **token** BotFather gives you (looks like `123456789:AAExxxx...`)

## Setup

```bash
npm install
echo "BOT_TOKEN=<your-token-here>" > .env
npm run db:push
npm start
```

## Commands

| Command | What it does |
|---|---|
| `/start` | Welcome + instructions |
| `/remind 30m fix bugs` | Remind in 30 minutes (`m`/`h`/`d` units) |
| `/remind 2h call supplier` | Remind in 2 hours |
| `/remind 1d pay invoice` | Remind tomorrow |
| `/list` | Show your pending reminders |
| `/done 3` | Mark reminder #3 complete |
| `/cancel 3` | Cancel reminder #3 |

Reminders fire via Telegram push when due (scheduler checks every 15s).

## Deploy

Runs as-is on any Node 18+ box. For 24/7 uptime:

```bash
pm2 start "npm start" --name reminder-bot
pm2 save
```

## Stack

Node.js · TypeScript · node-telegram-bot-api · Prisma + SQLite · pm2
