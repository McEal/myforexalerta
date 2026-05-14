import WebSocket from "ws";
import { getAllAlerts, getPairsWithAlerts, deleteAlert } from "./db.js";

const FINNHUB_WS = "wss://ws.finnhub.io";

let ws = null;
let sendAlertCallback = null;
let subscribedSymbols = new Set();
let pingInterval = null;
let reconnectTimeout = null;

export function startPriceMonitor(botSendFn) {
  sendAlertCallback = botSendFn;
  connect();
}

function connect() {
  const token = process.env.FINNHUB_TOKEN;
  ws = new WebSocket(`${FINNHUB_WS}?token=${token}`);

  ws.on("open", () => {
    console.log("✅ Finnhub WebSocket connected");
    subscribedSymbols.clear();
    resubscribeAll();

    // Keep-alive ping every 30s
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);
  });

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "trade" && msg.data) {
        for (const trade of msg.data) {
          checkAlerts(trade.s, trade.p); // symbol, price
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  });

  ws.on("close", () => {
    console.log("⚠️ Finnhub WebSocket closed. Reconnecting in 10s...");
    clearInterval(pingInterval);
    reconnectTimeout = setTimeout(connect, 10000);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
    ws.terminate();
  });
}

export function resubscribeAll() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const symbols = getPairsWithAlerts();
  for (const symbol of symbols) {
    if (!subscribedSymbols.has(symbol)) {
      subscribe(symbol);
    }
  }
}

export function subscribe(symbol) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  if (subscribedSymbols.has(symbol)) return;
  ws.send(JSON.stringify({ type: "subscribe", symbol }));
  subscribedSymbols.add(symbol);
  console.log(`📡 Subscribed to ${symbol}`);
}

function unsubscribe(symbol) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "unsubscribe", symbol }));
  subscribedSymbols.delete(symbol);
  console.log(`🔕 Unsubscribed from ${symbol}`);
}

async function checkAlerts(symbol, currentPrice) {
  const allAlerts = getAllAlerts();
  const relevant = allAlerts.filter((a) => a.symbol === symbol);

  for (const alert of relevant) {
    const target = parseFloat(alert.price);
    const triggered =
      (alert.direction === "above" && currentPrice >= target) ||
      (alert.direction === "below" && currentPrice <= target);

    if (triggered) {
      const emoji = alert.direction === "above" ? "📈" : "📉";
      const msg =
        `🔔 *Price Alert Triggered!*\n\n` +
        `${emoji} *${alert.pair}* hit your target\n` +
        `Target: \`${target}\`\n` +
        `Current: \`${currentPrice}\`\n` +
        `Direction: ${alert.direction === "above" ? "Crossed Above" : "Crossed Below"}`;

      await sendAlertCallback(alert.chatId, msg);

      if (!alert.recurrent) {
        await deleteAlert(alert.id);
        const remaining = getAllAlerts().filter((a) => a.symbol === symbol);
        if (remaining.length === 0) {
          unsubscribe(symbol);
        }
      }
      await deleteAlert(alert.id);

      // Unsubscribe from symbol if no more alerts for it
      const remaining = getAllAlerts().filter((a) => a.symbol === symbol);
      if (remaining.length === 0) {
        unsubscribe(symbol);
      }
    }
  }
}
