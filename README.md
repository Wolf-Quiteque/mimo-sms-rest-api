# MIMO SMS REST API (Node/Express)

A tiny REST service to send SMS messages via **MIMO**.

## Endpoints

### `POST /send-sms`

Body (JSON):
```json
{
  "to": "945263402",
  "text": "Olá, Mundo!",
  "sender": "KAYELA"   // optional, overrides default sender
}
```

Response:
```json
{
  "ok": true,
  "providerResponse": { "id": 18006, "...": "..." }
}
```

## Quick Start

```bash
# 1) Install deps
npm install

# 2) Configure env
cp .env.example .env
# edit .env with your real values:
# - MIMO_TOKEN
# - MIMO_DEFAULT_SENDER (must be approved on your account)
# - MIMO_BASE_URL (kept as default unless your provider gave another)

# 3) Run
npm run dev
# or
npm start
```

## Notes

- Uses the MIMO SMS `POST /mimosms/v1/message/send?token=...` endpoint with JSON `{ sender, recipients, text }` (per the PDF manual). 
- You can also send multiple recipients in `to` separated by commas (no spaces).
- For production hardenings (rate limits, retries, logging), add middlewares or a queue.

