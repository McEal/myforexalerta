import "dotenv/config";
import { Bot } from "grammy";
import { getAlerts, addAlert, removeAlert } from "./db.js";
import { parsePair, formatPrice } from "./utils.js";
import { startPriceMonitor, subscribe } from "./priceMonitor.js";

const bot = new Bot(process.env.BOT_TOKEN);

bot.command("start", (ctx) => {
  ctx.reply(
    `👋 *Welcome to Forex Alert Bot!*\n\n` +
    `Set unlimited price alerts on any forex pair.\n\n` +
    `*Commands:*\n` +
    `📌 /alert \`PAIR PRICE above|below\`\n` +
    `📌 /alert \`PAIR PRICE above|below recurrent\`\n` +
    `   _Example:_ /alert EURUSD 1.0850 above\n` +
    `   _Example:_ /alert XAUUSD 2300 below recurrent\n\n` +
    `📋 /alerts — view your active alerts\n` +
    `❌ /remove \`ID\` — cancel an alert`,
    { parse_mode: "Markdown" }
  );
});

bot.command("alert", async (ctx) => {
  try {
    const args = ctx.match?.trim().split(/\s+/);
    if (!args || args.length < 3) {
      return ctx.reply("⚠️ Usage: /alert PAIR PRICE above|below\nExample: /alert EURUSD 1.0850 above");
    }

    const [rawPair, rawPrice, rawDir, rawMode] = args;
    const recurrent = rawMode?.toLowerCase() === "recurrent";

    const parsed = parsePair(rawPair);
    if (!parsed) {
      return ctx.reply(`❌ Unknown pair: *${rawPair}*`, { parse_mode: "Markdown" });
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
    const id = await addAlert({ chatId, pair: parsed.pair, price, direction, symbol: parsed.symbol, recurrent });
    subscribe(parsed.symbol);

    const emoji = direction === "above" ? "📈" : "📉";
    const recurringLabel = recurrent ? "🔁 Recurrent" : "🔔 One-time";
    ctx.reply(
      `✅ *Alert set!*\n\n` +
      `${emoji} *${parsed.pair}* — ${direction} \`${formatPrice(price, parsed.pair)}\`\n` +
      `Type: ${recurringLabel}\n` +
      `Alert ID: \`${id}\`\n\n` +
      `You'll get a ping when price hits your level.`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Alert command error:", err);
    ctx.reply("❌ Something went wrong setting the alert. Try again.");
  }
});

bot.command("alerts", (ctx) => {
  const chatId = ctx.chat.id.toString();
  const alerts = getAlerts(chatId);

  if (alerts.length === 0) {
    return ctx.reply("You have no active alerts.\n\nSet one with /alert EURUSD 1.0850 above");
  }

  const lines = alerts.map((a, i) => {
    const emoji = a.direction === "above" ? "📈" : "📉";
    const recurIcon = a.recurrent ? " 🔁" : "";
    return `${i + 1}. ${emoji} *${a.pair}* — ${a.direction} \`${a.price}\`${recurIcon}\n   ID: \`${a.id}\``;
  });

  ctx.reply(
    `*Your Active Alerts (${alerts.length}):*\n\n` + lines.join("\n\n") +
    `\n\nUse /remove ID to cancel one.`,
    { parse_mode: "Markdown" }
  );
});

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
