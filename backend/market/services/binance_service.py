# market/services/binance_service.py
from django.conf import settings
from .http import get_json

BINANCE_BASE = getattr(settings, "BINANCE_BASE", "https://api.binance.com")

def _map_klines_to_candles(klines):
    # kline: [openTime, open, high, low, close, volume, closeTime, ...]
    candles = []
    for k in klines:
        open_time = int(k[0])  # ms
        candles.append({
            "time": open_time,   # ms (we'll let front convert)
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        })
    return candles

def get_crypto_candles(symbol: str, interval: str, limit: int = 200) -> dict:
    """
    Use Binance public /api/v3/klines
    """
    url = f"{BINANCE_BASE}/api/v3/klines"
    params = {"symbol": symbol.upper(), "interval": interval, "limit": limit}
    data = get_json(url, params=params)
    candles = _map_klines_to_candles(data)
    return {"symbol": symbol.upper(), "interval": interval, "candles": candles}

def get_latest_price(symbol: str) -> dict:
    """
    Binance ticker price (latest)
    """
    url = f"{BINANCE_BASE}/api/v3/ticker/price"
    params = {"symbol": symbol.upper()}
    d = get_json(url, params=params)
    # d: {"symbol":"BTCUSDT","price":"112484.94"}
    return {"symbol": d.get("symbol"), "price": float(d.get("price")), "timestamp": None}
