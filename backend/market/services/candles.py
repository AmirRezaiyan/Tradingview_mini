from datetime import datetime, timezone
import math

from .http import ProviderError

MAX_TIMESTAMP_SECONDS = 4_102_444_800


def _validated_timestamp(seconds):
    if seconds < 0 or seconds > MAX_TIMESTAMP_SECONDS:
        raise ProviderError("invalid_provider_data")
    return seconds


def timestamp_to_seconds(value):
    if isinstance(value, datetime):
        parsed = value
    else:
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            try:
                parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            except (TypeError, ValueError):
                raise ProviderError("invalid_provider_data") from None
        else:
            if not math.isfinite(numeric) or numeric < 0:
                raise ProviderError("invalid_provider_data")
            seconds = int(numeric / 1000) if numeric >= 1_000_000_000_000 else int(numeric)
            return _validated_timestamp(seconds)

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return _validated_timestamp(int(parsed.astimezone(timezone.utc).timestamp()))


def normalize_candles(rows, limit):
    candles_by_time = {}
    for row in rows:
        try:
            time_value = timestamp_to_seconds(row["time"])
            candle = {"time": time_value}
            for field in ("open", "high", "low", "close"):
                value = float(row[field])
                if not math.isfinite(value) or value <= 0:
                    raise ValueError
                candle[field] = value
            if "volume" in row:
                volume = float(row["volume"])
                if not math.isfinite(volume) or volume < 0:
                    raise ValueError
                candle["volume"] = volume
        except (KeyError, TypeError, ValueError, OverflowError):
            raise ProviderError("invalid_provider_data") from None

        if candle["high"] < max(candle["open"], candle["close"], candle["low"]):
            raise ProviderError("invalid_provider_data")
        if candle["low"] > min(candle["open"], candle["close"], candle["high"]):
            raise ProviderError("invalid_provider_data")
        candles_by_time[time_value] = candle

    return [candles_by_time[key] for key in sorted(candles_by_time)][-limit:]