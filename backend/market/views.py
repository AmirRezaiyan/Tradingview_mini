from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
from django.conf import settings
from .services.binance_service import get_crypto_candles
from .services.forex_service import get_forex_candles  
from .services.http import get_json
from datetime import datetime, timedelta
import time


class MarketDataView(APIView):
    def get(self, request, market_type):
        symbol = request.query_params.get("symbol")
        interval = request.query_params.get("interval", "1h")

        if not symbol:
            return Response({"error": "Symbol parameter is required"}, status=400)

        if market_type == "crypto":
            data = get_crypto_candles(symbol, interval)
        elif market_type == "forex":
            data = get_forex_candles(symbol, interval)
        else:
            return Response({"error": "Invalid market type"}, status=400)

        return Response(data, status=status.HTTP_200_OK)


class LatestPriceView(APIView):
    def get(self, request, market_type):
        symbol = request.query_params.get("symbol")
        if not symbol:
            return Response({"error": "Symbol parameter is required"}, status=400)

        if market_type == "crypto":
            from .services.binance_service import get_latest_price
            price = get_latest_price(symbol)
            return Response(price, status=200)

        elif market_type == "forex":
            key = settings.TWELVEDATA_KEY
            url = f"https://api.twelvedata.com/price?symbol={symbol}&apikey={key}"
            try:
                resp = requests.get(url, timeout=10)
                resp.raise_for_status()
                data = resp.json()
                if "price" in data:
                    return Response({"symbol": symbol, "price": float(data["price"])}, status=200)
                else:
                    return Response({"error": data.get("message", "Unknown error")}, status=400)
            except Exception as e:
                return Response({"error": str(e)}, status=500)

        else:
            return Response({"error": "Invalid market type"}, status=400)