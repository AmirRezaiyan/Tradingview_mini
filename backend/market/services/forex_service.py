import math
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings

from .candles import normalize_candles
from .http import ProviderError, get_json


TWELVE_BASE = "https://api.twelvedata.com"
TWELVEDATA_INTERVALS = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1h": "1h",
    "4h": "4h",
    "1d": "1day",
    "1w": "1week",
    "1M": "1month",
}


def _api_key():
    if not settings.TWELVEDATA_KEY:
        raise ProviderError("provider_not_configured", status_code=503)
    return settings.TWELVEDATA_KEY


def _check_provider_error(payload):
    if isinstance(payload, dict) and payload.get("status") == "error":
        code = str(payload.get("code", ""))
        if code == "429":
            return ProviderError("provider_rate_limited", status_code=429)
        if code in {"400", "404"}:
            return ProviderError("unsupported_symbol_or_interval", status_code=400)
        return ProviderError("provider_rejected_request", status_code=502)
    return None


def get_forex_candles(symbol, interval, limit=200):
    provider_interval = TWELVEDATA_INTERVALS.get(interval)
    if provider_interval is None:
        raise ProviderError("unsupported_interval", status_code=400)

    is_calendar_interval = interval in {"1d", "1w", "1M"}
    params = {
        "symbol": symbol.upper(),
        "interval": provider_interval,
        "outputsize": limit,
        "format": "JSON",
        "apikey": _api_key(),
    }
    if not is_calendar_interval:
        params["timezone"] = "UTC"

    payload = get_json(f"{TWELVE_BASE}/time_series", params=params)
    error = _check_provider_error(payload)
    if error:
        raise error
    values = payload.get("values") if isinstance(payload, dict) else None
    if not isinstance(values, list):
        raise ProviderError("invalid_provider_response", status_code=502)

    exchange_timezone = None
    if is_calendar_interval and values:
        metadata = payload.get("meta")
        timezone_name = metadata.get("exchange_timezone") if isinstance(metadata, dict) else None
        if not isinstance(timezone_name, str) or not timezone_name:
            raise ProviderError("invalid_provider_response", status_code=502)
        try:
            exchange_timezone = ZoneInfo(timezone_name)
        except (ZoneInfoNotFoundError, ValueError):
            raise ProviderError("invalid_provider_response", status_code=502) from None

    rows = []
    for item in values:
        if not isinstance(item, dict):
            raise ProviderError("invalid_provider_data", status_code=502)
        time_value = item.get("datetime")
        if exchange_timezone:
            try:
                time_value = datetime.fromisoformat(str(time_value).replace("Z", "+00:00"))
            except (TypeError, ValueError):
                raise ProviderError("invalid_provider_data", status_code=502) from None
            if time_value.tzinfo is None:
                time_value = time_value.replace(tzinfo=exchange_timezone)
        rows.append({
            "time": time_value,
            "open": item.get("open"),
            "high": item.get("high"),
            "low": item.get("low"),
            "close": item.get("close"),
        })
    candles = normalize_candles(rows, limit)
    return {"symbol": symbol.upper(), "interval": interval, "candles": candles}


def get_forex_latest_price(symbol):
    payload = get_json(
        f"{TWELVE_BASE}/price",
        params={"symbol": symbol.upper(), "apikey": _api_key()},
    )
    error = _check_provider_error(payload)
    if error:
        raise error
    try:
        price = float(payload["price"])
    except (KeyError, TypeError, ValueError, OverflowError):
        raise ProviderError("invalid_provider_data", status_code=502) from None
    if not math.isfinite(price) or price <= 0:
        raise ProviderError("invalid_provider_data", status_code=502)
    return {"symbol": symbol.upper(), "price": price, "timestamp": None}
