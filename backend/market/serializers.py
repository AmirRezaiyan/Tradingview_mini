import re

from rest_framework import serializers


CRYPTO_INTERVALS = {"1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"}
FOREX_INTERVALS = {"1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"}


class MarketDataQuerySerializer(serializers.Serializer):
    symbol = serializers.CharField(max_length=20, trim_whitespace=True)
    interval = serializers.CharField(max_length=5, default="1h")
    limit = serializers.IntegerField(min_value=1, max_value=5000, default=200)

    def validate(self, attrs):
        market_type = self.context.get("market_type")
        symbol = attrs["symbol"].upper()
        interval = attrs["interval"]

        if market_type == "crypto":
            if not re.fullmatch(r"[A-Z0-9]{5,20}", symbol):
                raise serializers.ValidationError({"symbol": "Use a valid crypto symbol, such as BTCUSDT."})
            if attrs["limit"] > 1000:
                raise serializers.ValidationError({"limit": "Crypto candle limits cannot exceed 1000."})
            allowed_intervals = CRYPTO_INTERVALS
        elif market_type == "forex":
            symbol = symbol.replace("_", "/")
            if re.fullmatch(r"[A-Z]{6}", symbol):
                symbol = f"{symbol[:3]}/{symbol[3:]}"
            if not re.fullmatch(r"[A-Z]{3}/[A-Z]{3}", symbol):
                raise serializers.ValidationError({"symbol": "Use a forex pair such as EUR/USD."})
            allowed_intervals = FOREX_INTERVALS
        else:
            raise serializers.ValidationError({"market_type": "Supported markets are crypto and forex."})

        if interval not in allowed_intervals:
            raise serializers.ValidationError({"interval": "Unsupported interval for this market."})

        attrs["symbol"] = symbol
        return attrs