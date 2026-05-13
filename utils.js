// Converts user input like "EURUSD", "EUR/USD", "eur usd" → { pair: "EURUSD", symbol: "OANDA:EUR_USD" }

const KNOWN_PAIRS = {
  EURUSD: "OANDA:EUR_USD",
  GBPUSD: "OANDA:GBP_USD",
  USDJPY: "OANDA:USD_JPY",
  USDCHF: "OANDA:USD_CHF",
  AUDUSD: "OANDA:AUD_USD",
  NZDUSD: "OANDA:NZD_USD",
  USDCAD: "OANDA:USD_CAD",
  GBPJPY: "OANDA:GBP_JPY",
  EURJPY: "OANDA:EUR_JPY",
  EURGBP: "OANDA:EUR_GBP",
  XAUUSD: "OANDA:XAU_USD",
  XAGUSD: "OANDA:XAG_USD",
  USDHKD: "OANDA:USD_HKD",
  USDSGD: "OANDA:USD_SGD",
  EURCAD: "OANDA:EUR_CAD",
  GBPAUD: "OANDA:GBP_AUD",
  AUDCAD: "OANDA:AUD_CAD",
  NZDCAD: "OANDA:NZD_CAD",
};

export function parsePair(input) {
  // Normalize: remove spaces, slashes, dashes → uppercase
  const clean = input.replace(/[\s\/\-_]/g, "").toUpperCase();

  if (KNOWN_PAIRS[clean]) {
    return { pair: clean, symbol: KNOWN_PAIRS[clean] };
  }

  // Try auto-mapping for 6-char pairs: first 3 = base, last 3 = quote
  if (clean.length === 6) {
    const base = clean.slice(0, 3);
    const quote = clean.slice(3);
    const symbol = `OANDA:${base}_${quote}`;
    return { pair: clean, symbol };
  }

  return null;
}

export function formatPrice(price, pair) {
  // JPY pairs use 3 decimal places, others use 5
  if (pair.includes("JPY")) return price.toFixed(3);
  if (pair.includes("XAU") || pair.includes("XAG")) return price.toFixed(2);
  return price.toFixed(5);
}
