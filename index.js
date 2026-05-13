import "dotenv/config";
import { Bot } from "grammy";
import { getAlerts, addAlert, removeAlert } from "./db.js";
import { parsePair, formatPrice } from "./utils.js";
import { startPriceMonitor, subscribe } from "./priceMonitor.js";

const bot = new Bot(process.env.BOT_TOKEN);

// ─── /start ──────────────────────────────────────────────────────────────────
bot.command("start", (ctx) => {
  ctx.reply(
    `👋 *Welcome to Forex Alert Bot!*\n\n` +
    `Set unlimited price alerts on any forex pair and get pinged here when price hits your level.\n\n` +
    `*Commands:*\n` +
    `📌 /alert \`PAIR PRICE above|below\`\n` +
    `   _Example:_ /alert EURUSD 1.0850 above\n\n` +
    `📋 /alerts — view your active alerts\n` +
    `❌ /remove \`ID\` — cancel an alert\n\n` +
    `*Supported pairs:* EURUSD, GBPUSD, USDJPY, XAUUSD, GBPJPY, AUDUSD, and more.`,
    { parse_mode: "Markdown" }
  );
});

// ─── /help ───────────────────────────────────────────────────────────────────
bot.command("help", (ctx) => {
  ctx.reply(
    `*How to set an alert:*\n` +
    `/alert EURUSD 1.0850 above\n` +
    `/alert XAUUSD 2350 below\n` +
    `/alert GBPJPY 195.50 above\n\n` +
    `*above* = alert when price rises to or above your level\n` +
    `*below* = alert when price falls to or below your level\n\n` +
    `Use /alerts to see your active alerts\n` +
    `Use /remove ID to cancel one`,
    { parse_mode: "Markdown" }
  );
});

// ─── /alert ──────────────────────────────────────────────────────────────────
bot.command("alert", async (ctx) => {
  const args = ctx.match?.trim().split(/\s+/);
  if (!args || args.length < 3) {
    return ctx.reply(
      "⚠️ Usage: /alert PAIR PRICE above|below\nExample: /alert EURUSD 1.0850 above"
    );
  }

  const [rawPair, rawPrice, rawDir] = args;
  const parsed = parsePair(rawPair);
  if (!parsed) {
    return ctx.reply(`❌ Unknown pair: *${rawPair}*\nTry something like EURUSD, GBPUSD, XAUUSD.`, { parse_mode: "Markdown" });
  }

  const price = parseFloat(rawPrice);
  if (isNaN(price) || price <= 0) {
    return ctx.reply("❌ Invalid price. Enter a positive number.");
  }

  const direction = rawDir?.toLowerCase();
  if (direction !== "above" && direction !== "below") {
    return ctx.reply("❌ Direction must be `above` or `below`.", { parse_mode: "Markdown" });
  }

  const chatId = ctx.chat.id.toString();
  const id = await addAlert({ chatId, pair: parsed.pair, price, direction, symbol: parsed.symbol });
  subscribe(parsed.symbol);

  const emoji = direction === "above" ? "📈" : "📉";
  ctx.reply(
    `✅ *Alert set!*\n\n` +
    `${emoji} *${parsed.pair}* — ${direction} \`${formatPrice(price, parsed.pair)}\`\n` +
    `Alert ID: \`${id}\`\n\n` +
    `You'll get a ping here when price hits your level.`,
    { parse_mode: "Markdown" }
  );
});

// ─── /alerts ─────────────────────────────────────────────────────────────────
bot.command("alerts", (ctx) => {
  const chatId = ctx.chat.id.toString();
  const alerts = getAlerts(chatId);

  if (alerts.length === 0) {
    return ctx.reply("You have no active alerts.\n\nSet one with /alert EURUSD 1.0850 above");
  }

  const lines = alerts.map((a, i) => {
    const emoji = a.direction === "above" ? "📈" : "📉";
    return `${i + 1}. ${emoji} *${a.pair}* — ${a.direction} \`${a.price}\`\n   ID: \`${a.id}\``;
  });

  ctx.reply(
    `*Your Active Alerts (${alerts.length}):*\n\n` + lines.join("\n\n") +
    `\n\nUse /remove ID to cancel one.`,
    { parse_mode: "Markdown" }
  );
});

// ─── /remove ─────────────────────────────────────────────────────────────────
bot.command("remove", async (ctx) => {
  const id = ctx.match?.trim();
  if (!id) return ctx.reply("Usage: /remove ALERT_ID\nGet IDs from /alerts");

  const chatId = ctx.chat.id.toString();
  const deleted = await removeAlert(id, chatId);

  if (deleted) {
    ctx.reply(`✅ Alert \`${id}\` removed.`, { parse_mode: "Markdown" });
  } else {
    ctx.reply(`❌ Alert not found. Check your IDs with /alerts.`);
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
async function sendAlert(chatId, text) {
  try {
    await bot.api.sendMessage(chatId, text, { parse_mode: "Markdown" });
  } catch (e) {
    console.error(`Failed to send alert to ${chatId}:`, e.message);
  }
}

startPriceMonitor(sendAlert);

bot.start();
console.log("🤖 Forex Alert Bot running...");
