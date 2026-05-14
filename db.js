import { readFileSync, writeFileSync, existsSync } from "fs";

const FILE = "alerts.json";

function load() {
  if (!existsSync(FILE)) return { alerts: [] };
  try { return JSON.parse(readFileSync(FILE, "utf8")); }
  catch { return { alerts: [] }; }
}

function save(data) {
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

export function getAlerts(chatId = null) {
  const data = load();
  if (chatId) return data.alerts.filter((a) => a.chatId === chatId);
  return data.alerts;
}

export function getAllAlerts() {
  return load().alerts;
}

export async function addAlert({ chatId, pair, price, direction, symbol, recurrent }) {
  const data = load();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  data.alerts.push({ id, chatId, pair, price, direction, symbol, recurrent: recurrent || false, createdAt: new Date().toISOString() });
  save(data);
  return id;
}

export async function removeAlert(id, chatId) {
  const data = load();
  const before = data.alerts.length;
  data.alerts = data.alerts.filter((a) => !(a.id === id && a.chatId === chatId));
  save(data);
  return data.alerts.length < before;
}

export async function deleteAlert(id) {
  const data = load();
  data.alerts = data.alerts.filter((a) => a.id !== id);
  save(data);
}

export function getPairsWithAlerts() {
  const data = load();
  return [...new Set(data.alerts.map((a) => a.symbol))];
}
