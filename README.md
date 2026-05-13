# 📈 Forex Alert Bot

Unlimited Telegram price alerts for forex pairs. Beats TradingView's 3-alert limit.

## Setup

### 1. Get your credentials

**Telegram Bot Token:**
- Open Telegram → search `@BotFather`
- Send `/newbot` and follow the steps
- Copy the token you get

**Finnhub API Key (free):**
- Go to [finnhub.io](https://finnhub.io) and create a free account
- Your API key is on the dashboard

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` and fill in both tokens:
```
BOT_TOKEN=123456:ABC-DEF...
FINNHUB_TOKEN=your_key_here
```

### 3. Install & Run

```bash
npm install
npm start
```

The bot runs with long polling — no server or domain needed.

---

## Commands

| Command | Description |
|---|---|
| `/start` | Welcome message + instructions |
| `/alert EURUSD 1.0850 above` | Set a price alert |
| `/alert XAUUSD 2300 below` | Alert when Gold drops below 2300 |
| `/alerts` | List your active alerts |
| `/remove ID` | Cancel an alert by ID |

## Supported Pairs

EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, NZDUSD, USDCAD, GBPJPY, EURJPY, EURGBP, XAUUSD (Gold), XAGUSD (Silver), and any standard 6-character pair.

## Hosting (optional)

To run 24/7, deploy to:
- **Railway** (free tier) — connect GitHub repo, add env vars, deploy
- **Render** (free tier) — same flow
- **VPS** — run with `pm2 start index.js`

## Notes

- Alerts are **one-time** — they fire once and are removed
- Data is stored in `alerts.json` in the project folder
- Finnhub free tier is near real-time (~1-15 second delay for forex)
