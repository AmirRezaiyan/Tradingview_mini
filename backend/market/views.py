import logging

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from .serializers import MarketDataQuerySerializer
from .services.binance_service import get_crypto_candles, get_latest_price
from .services.cache import cached_market_call
from .services.forex_service import get_forex_candles, get_forex_latest_price
from .services.http import ProviderError


logger = logging.getLogger(__name__)

PROVIDER_ERROR_RESPONSES = {
    "unsupported_symbol_or_interval": ("Unsupported symbol or interval.", status.HTTP_400_BAD_REQUEST),
    "unsupported_interval": ("Unsupported interval.", status.HTTP_400_BAD_REQUEST),
    "provider_not_configured": ("Market data provider is not configured.", status.HTTP_503_SERVICE_UNAVAILABLE),
    "provider_rate_limited": ("Market data provider is rate limited. Try again later.", status.HTTP_503_SERVICE_UNAVAILABLE),
    "provider_timeout": ("Market data provider timed out.", status.HTTP_504_GATEWAY_TIMEOUT),
    "provider_unavailable": ("Market data provider is unavailable.", status.HTTP_502_BAD_GATEWAY),
    "invalid_provider_response": ("Market data provider returned an invalid response.", status.HTTP_502_BAD_GATEWAY),
    "invalid_provider_data": ("Market data provider returned invalid data.", status.HTTP_502_BAD_GATEWAY),
    "provider_rejected_request": ("Market data provider rejected the request.", status.HTTP_502_BAD_GATEWAY),
}


def validate_query(request, market_type):
    serializer = MarketDataQuerySerializer(
        data=request.query_params,
        context={"market_type": market_type},
    )
    if not serializer.is_valid():
        return None, Response(
            {"error": "Invalid query parameters.", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return serializer.validated_data, None


def provider_error_response(error):
    message, response_status = PROVIDER_ERROR_RESPONSES.get(
        error.code,
        ("Market data is temporarily unavailable.", status.HTTP_502_BAD_GATEWAY),
    )
    logger.warning("Market provider request failed with code %s", error.code)
    return Response({"error": message, "code": error.code}, status=response_status)


class MarketDataView(APIView):
    throttle_scope = "market_data"
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    def get(self, request, market_type):
        if market_type not in {"crypto", "forex"}:
            return Response({"error": "Supported markets are crypto and forex."}, status=400)
        params, error_response = validate_query(request, market_type)
        if error_response:
            return error_response
        loader = get_crypto_candles if market_type == "crypto" else get_forex_candles
        key = f"market:candles:{market_type}:{params['symbol']}:{params['interval']}:{params['limit']}"
        try:
            data = cached_market_call(
                key,
                settings.MARKET_CANDLES_CACHE_TTL,
                lambda: loader(params["symbol"], params["interval"], params["limit"]),
            )
        except ProviderError as error:
            return provider_error_response(error)
        except Exception as error:
            logger.error("Unexpected market-data failure (%s)", type(error).__name__)
            return Response(
                {"error": "Market data is temporarily unavailable.", "code": "market_data_error"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(data)


class LatestPriceView(APIView):
    throttle_scope = "market_data"
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]

    def get(self, request, market_type):
        if market_type not in {"crypto", "forex"}:
            return Response({"error": "Supported markets are crypto and forex."}, status=400)
        params, error_response = validate_query(request, market_type)
        if error_response:
            return error_response
        loader = get_latest_price if market_type == "crypto" else get_forex_latest_price
        key = f"market:latest:{market_type}:{params['symbol']}"
        try:
            data = cached_market_call(
                key,
                settings.MARKET_LATEST_CACHE_TTL,
                lambda: loader(params["symbol"]),
            )
        except ProviderError as error:
            return provider_error_response(error)
        except Exception as error:
            logger.error("Unexpected latest-price failure (%s)", type(error).__name__)
            return Response(
                {"error": "Market data is temporarily unavailable.", "code": "market_data_error"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(data)