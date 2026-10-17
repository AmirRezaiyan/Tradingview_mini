# market/services/binance_service.py
from django.conf import settings

from .candles import normalize_candles
from .http import ProviderError, get_json


def _map_klines_to_candles(klines, limit):
    if not isinstance(klines, list):
        raise ProviderError("invalid_provider_response", status_code=502)

    rows = []
    for item in klines:
        if not isinstance(item, (list, tuple)) or len(item) < 6:
            raise ProviderError("invalid_provider_data", status_code=502)
        rows.append({
            "time": item[0],
            "open": item[1],
            "high": item[2],
            "low": item[3],
            "close": item[4],
            "volume": item[5],
        })
    return normalize_candles(rows, limit)


def get_crypto_candles(symbol, interval, limit=200):
    url = f"{settings.BINANCE_BASE.rstrip('/')}/api/v3/klines"
    params = {"symbol": symbol.upper(), "interval": interval, "limit": limit}
    data = get_json(url, params=params)
    candles = _map_klines_to_candles(data, limit)
    return {"symbol": symbol.upper(), "interval": interval, "candles": candles}


def get_latest_price(symbol):
    url = f"{settings.BINANCE_BASE.rstrip('/')}/api/v3/ticker/price"
    data = get_json(url, params={"symbol": symbol.upper()})
    if not isinstance(data, dict):
        raise ProviderError("invalid_provider_response", status_code=502)
    try:
        price = float(data["price"])
        if price <= 0 or price == float("inf") or price != price:
            raise ValueError
    except (KeyError, TypeError, ValueError, OverflowError):
        raise ProviderError("invalid_provider_data", status_code=502) from None
    return {"symbol": data.get("symbol", symbol.upper()), "price": price, "timestamp": None}
