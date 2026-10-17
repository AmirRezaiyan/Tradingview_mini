# TradingView Mini Backend

This Django REST Framework API supports the React demo with Binance crypto data, TwelveData forex data, and anonymous shared notes. It is a portfolio/demo project, not a private multi-user notes service. Anyone who can reach the notes API can read, create, update, or delete shared notes; do not host it for multiple users as private data.

## Local setup

From the repository root in PowerShell:

```powershell
cd backend
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py check
python manage.py runserver
```

The SQLite database is created locally by migrations. The local database file is intentionally excluded from Git. Do not put provider keys or real deployment secrets in `.env.example` or commit `.env`.

## Configuration

`.env.example` lists the supported settings and explicitly opts into `DEBUG=True` plus local Vite CORS origins for development. Without a `DEBUG` environment value, settings default to `DEBUG=False` and require a strong `SECRET_KEY` and exact `ALLOWED_HOSTS`. For deployment, explicitly provide those values and set the required `CORS_ALLOWED_ORIGINS` when the frontend uses another origin. HTTPS redirect, secure cookies, and HSTS default on when debug is disabled; verify the TLS/proxy setup before deployment. Set `TRUST_X_FORWARDED_PROTO=True` only when a trusted proxy overwrites that header.

The defaults use SQLite and per-process LocMemCache for simple local setup. `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `CACHE_BACKEND`, and `CACHE_LOCATION` allow choosing deployment backends. Install the matching backend driver/package separately before selecting one. LocMemCache does not share cache entries or throttle counts between worker processes.

Market candles and latest quotes are cached using `MARKET_CANDLES_CACHE_TTL` and `MARKET_LATEST_CACHE_TTL`. Anonymous request rates can be adjusted through `ANON_THROTTLE_RATE`, `MARKET_THROTTLE_RATE`, and `NOTES_THROTTLE_RATE`. DRF throttling is a best-effort application control, not a substitute for infrastructure-level abuse protection.

## Market API

Existing routes and response envelopes are preserved:

- `GET /api/market/crypto/?symbol=BTCUSDT&interval=1h&limit=200`
- `GET /api/market/forex/?symbol=EUR%2FUSD&interval=1h&limit=200`
- `GET /api/market/crypto/latest_price/?symbol=BTCUSDT`
- `GET /api/market/forex/latest_price/?symbol=EUR%2FUSD`

Supported intervals for both markets are `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`, and `1M`. Forex intervals map to TwelveData `1min`, `5min`, `15min`, `30min`, `1h`, `4h`, `1day`, `1week`, and `1month`. Forex symbols accept slash, underscore, or compact three-letter pairs and normalize to the slash form; the provider determines whether a syntactically valid pair is listed. Crypto limits range from 1 to 1000; forex limits range from 1 to 5000. Both default to 200.

Candle responses keep the existing object envelope. Candle `time` is a Unix timestamp in **seconds**, normalized to UTC; this corrects the earlier mixed Binance-milliseconds / timezone-naive forex values. Intraday forex requests explicitly request UTC. TwelveData ignores its timezone parameter for daily, weekly, and monthly candles, so those naive timestamps are interpreted in the returned `meta.exchange_timezone` before conversion to UTC. Invalid or timezone-unidentifiable provider data fails rather than being mislabeled.

```json
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "candles": [
    {"time": 1700000000, "open": 36000.0, "high": 36100.0, "low": 35900.0, "close": 36050.0, "volume": 12.5}
  ]
}
```

Latest price responses retain `symbol`, `price`, and `timestamp`. Providers do not supply a normalized quote timestamp in this adapter, so `timestamp` remains `null`; clients must not treat a latest-price snapshot as a complete OHLC candle.

Invalid client parameters return HTTP 400. Provider timeouts return 504; rate limits/unavailability return sanitized 502/503 responses. Responses do not include raw provider messages, URLs, credentials, or Python exceptions.

## Shared notes API

- `GET /api/notes/` lists all shared notes; `?symbol=BTCUSDT` filters by symbol.
- `POST /api/notes/` creates a note with `symbol` and `content`.
- `GET`, `PATCH`, `PUT`, and `DELETE /api/notes/{id}/` operate on a shared note.

Content is trimmed and limited to 5000 characters; symbol is limited to 64 characters. Notes remain anonymous by design and are not confidential.

## Checks and tests

```powershell
python manage.py check
python manage.py check --deploy
python manage.py makemigrations --check --dry-run
python manage.py test
```

Deployment check must be run with the actual production environment variables. This project does not currently include a production WSGI server, external shared cache, CI workflow, or infrastructure configuration; passing Django checks alone does not make it production-ready.
