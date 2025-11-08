# market/services/forex_service.py
from django.conf import settings
from .http import get_json
import urllib.parse

TWELVE_BASE = "https://api.twelvedata.com"
API_KEY = getattr(settings, "TWELVEDATA_KEY", "")

def get_forex_candles(symbol: str, interval: str, limit: int = 200) -> dict:
    """
    symbol e.g. 'EUR/USD' expected by TwelveData
    interval e.g. '1h', '1m', '1d' (TwelveData supports '1min','5min','15min','30min','1h','4h','1day',...)
    """
    sd = symbol.replace("/", "%2F")  # URL encode slash
    url = f"{TWELVE_BASE}/time_series"
    params = {
        "symbol": symbol,
        "interval": interval.replace("h", "h").replace("m","min"),  # adjust if needed
        "outputsize": limit,
        "format": "JSON",
        "apikey": API_KEY,
    }
    # TwelveData returns data.items with 'datetime','open','high','low','close'
    r = get_json(url, params=params)
    items = r.get("values") or r.get("values", []) or []
    # if provider different, adapt accordingly
    candles = []
    # TwelveData returns newest-first; reverse to chronological
    items = list(reversed(items))
    for it in items:
        # datetime -> to timestamp (UTC)
        # TwelveData datetime is like "2025-10-27 14:00:00"
        # We'll let front convert if necessary, store timestamp as ms
        # Use provided 'datetime' field -> convert to unix ms using helper? but to keep simple:
        # TwelveData sometimes returns 'datetime' string; put epoch ms as None? Better: ask get_json to parse? Simpler: use API that returns timestamp? 
        # For now, we include the 'datetime' string and front will handle conversion to timestamp.
        candles.append({
            "time": it.get("datetime"),
            "open": float(it.get("open")),
            "high": float(it.get("high")),
            "low": float(it.get("low")),
            "close": float(it.get("close")),
        })
    return {"symbol": symbol, "interval": interval, "candles": candles}

def get_forex_latest_price(symbol: str) -> dict:
    # TwelveData /quote endpoint
    url = f"{TWELVE_BASE}/price"
    params = {"symbol": symbol, "apikey": API_KEY}
    r = get_json(url, params=params)
    price = r.get("price")
    return {"symbol": symbol, "price": float(price) if price else None, "timestamp": None}
