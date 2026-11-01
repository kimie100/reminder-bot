import TelegramBot from "node-telegram-bot-api"
import { prisma } from "./db"

const token = process.env.BOT_TOKEN
if (!token) {
  console.error("BOT_TOKEN missing — put it in .env")
  process.exit(1)
}

const bot = new TelegramBot(token, { polling: true })
console.log("Reminder bot polling…")

const DUR = /(\d+)\s*(m|h|d)/i // 30m | 2h | 1d

function parseDuration(raw: string): number | null {
  const m = raw.match(DUR)
  if (!m) return null
  const n = Number(m[1])
  const unit = m[2].toLowerCase()
  if (unit === "m") return n * 60_000
  if (unit === "h") return n * 3_600_000
  return n * 86_400_000
}

const fmt = (d: Date) => d.toLocaleString("en-MY", { hour12: false })

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    [
      "👋 *Simple Reminder Bot*",
      "",
      "`/remind 30m fix bugs` — remind in 30 minutes",
      "`/remind 2h call supplier` — remind in 2 hours",
      "`/remind 1d pay invoice` — remind tomorrow",
      "",
      "`/list` — your pending reminders",
      "`/done <id>` — mark complete",
      "`/cancel <id>` — cancel a reminder",
    ].join("\n"),
    { parse_mode: "Markdown" }
  )
})

bot.onText(/\/remind\s+(\S+)\s+([\s\S]+)/, async (msg, match) => {
  const chatId = String(msg.chat.id)
  const ms = parseDuration(match![1])
  if (!ms || ms <= 0) {
    bot.sendMessage(chatId, "❌ Invalid duration. Use `30m`, `2h`, or `1d`.", { parse_mode: "Markdown" })
    return
  }
  const dueAt = new Date(Date.now() + ms)
  const r = await prisma.reminder.create({
    data: { chatId, text: match![2].trim(), dueAt },
  })
  bot.sendMessage(
    chatId,
    `✅ Reminder #${r.id} set for *${fmt(dueAt)}*:\n"${r.text}"`,
    { parse_mode: "Markdown" }
  )
})

bot.onText(/\/list/, async (msg) => {
  const chatId = String(msg.chat.id)
  const rows = await prisma.reminder.findMany({
    where: { chatId, status: "PENDING" },
    orderBy: { dueAt: "asc" },
  })
  if (rows.length === 0) {
    bot.sendMessage(chatId, "📭 No pending reminders. Use `/remind 30m your task`.")
    return
  }
  const lines = rows.map(
    (r) => `#${r.id} — ${fmt(r.dueAt)}\n"${r.text}"`
  )
  bot.sendMessage(chatId, `📋 *Pending (${rows.length}):*\n\n${lines.join("\n\n")}`, { parse_mode: "Markdown" })
})

bot.onText(/\/done\s+(\d+)/, async (msg, match) => {
  const chatId = String(msg.chat.id)
  const id = Number(match![1])
  const r = await prisma.reminder.updateMany({
    where: { id, chatId, status: "PENDING" },
    data: { status: "DONE" },
  })
  bot.sendMessage(chatId, r.count ? `✅ #${id} marked done.` : `❌ Reminder #${id} not found.`)
})

bot.onText(/\/cancel\s+(\d+)/, async (msg, match) => {
  const chatId = String(msg.chat.id)
  const id = Number(match![1])
  const r = await prisma.reminder.updateMany({
    where: { id, chatId, status: "PENDING" },
    data: { status: "CANCELLED" },
  })
  bot.sendMessage(chatId, r.count ? `🗑 #${id} cancelled.` : `❌ Reminder #${id} not found.`)
})

// Scheduler: fire due reminders every 15s
setInterval(async () => {
  const due = await prisma.reminder.findMany({
    where: { status: "PENDING", dueAt: { lte: new Date() } },
  })
  for (const r of due) {
    try {
      await bot.sendMessage(r.chatId, `⏰ *Reminder:*\n"${r.text}"`, { parse_mode: "Markdown" })
      await prisma.reminder.update({ where: { id: r.id }, data: { status: "DONE" } })
    } catch (e) {
      console.error("fire failed", r.id, e)
    }
  }
}, 15_000)
