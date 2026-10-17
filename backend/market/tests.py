import os
from datetime import datetime, timezone
from io import StringIO
from unittest.mock import patch

import requests
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle

from .services.binance_service import get_crypto_candles
from .services.candles import timestamp_to_seconds
from .services.forex_service import get_forex_candles
from .services.http import ProviderError, create_session, get_json
from backend.settings import env_bool, env_list


class MarketEndpointTests(TestCase):
	def setUp(self):
		cache.clear()
		self.client = APIClient()

	def test_missing_and_invalid_query_parameters_are_rejected(self):
		missing = self.client.get("/api/market/crypto/")
		invalid_symbol = self.client.get("/api/market/crypto/?symbol=BTC%2FUSDT")
		invalid_interval = self.client.get("/api/market/forex/?symbol=EUR%2FUSD&interval=2d")
		invalid_limit = self.client.get("/api/market/crypto/?symbol=BTCUSDT&limit=1001")
		invalid_forex_limit = self.client.get("/api/market/forex/?symbol=EUR%2FUSD&limit=5001")

		self.assertEqual(missing.status_code, 400)
		self.assertEqual(invalid_symbol.status_code, 400)
		self.assertEqual(invalid_interval.status_code, 400)
		self.assertEqual(invalid_limit.status_code, 400)
		self.assertEqual(invalid_forex_limit.status_code, 400)

	@patch("market.views.get_crypto_candles")
	def test_candle_contract_passes_validated_limit_and_uses_cache(self, provider):
		provider.return_value = {
			"symbol": "BTCUSDT",
			"interval": "1h",
			"candles": [{"time": 1700000000, "open": 1, "high": 2, "low": 1, "close": 2}],
		}

		first = self.client.get("/api/market/crypto/?symbol=btcusdt&interval=1h&limit=25")
		second = self.client.get("/api/market/crypto/?symbol=BTCUSDT&interval=1h&limit=25")

		self.assertEqual(first.status_code, 200)
		self.assertEqual(set(first.data), {"symbol", "interval", "candles"})
		self.assertEqual(first.data["candles"][0]["time"], 1700000000)
		self.assertEqual(second.data, first.data)
		provider.assert_called_once_with("BTCUSDT", "1h", 25)

	@patch("market.views.get_crypto_candles", return_value={
		"symbol": "BTCUSDT",
		"interval": "1h",
		"candles": [],
	})
	def test_empty_candle_response_is_a_wrapped_empty_list(self, provider):
		response = self.client.get("/api/market/crypto/?symbol=BTCUSDT&interval=1h")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data, {"symbol": "BTCUSDT", "interval": "1h", "candles": []})
		provider.assert_called_once_with("BTCUSDT", "1h", 200)

	@patch("market.views.get_crypto_candles", side_effect=ProviderError("invalid_provider_response"))
	def test_malformed_candle_provider_response_is_a_structured_error(self, provider):
		response = self.client.get("/api/market/crypto/?symbol=BTCUSDT&interval=1h")

		self.assertEqual(response.status_code, 502)
		self.assertEqual(response.data["code"], "invalid_provider_response")
		self.assertIsInstance(response.data["error"], str)
		provider.assert_called_once()

	@patch("market.views.get_latest_price", return_value={
		"symbol": "BTCUSDT",
		"price": 123.45,
		"timestamp": None,
	})
	def test_latest_price_response_has_numeric_price(self, provider):
		response = self.client.get("/api/market/crypto/latest_price/?symbol=BTCUSDT")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(set(response.data), {"symbol", "price", "timestamp"})
		self.assertIsInstance(response.data["price"], float)
		provider.assert_called_once_with("BTCUSDT")

	@patch("market.views.get_latest_price", side_effect=ProviderError("provider_timeout"))
	def test_latest_price_provider_failure_uses_structured_error(self, provider):
		response = self.client.get("/api/market/crypto/latest_price/?symbol=BTCUSDT")

		self.assertEqual(response.status_code, 504)
		self.assertEqual(response.data["code"], "provider_timeout")
		self.assertIsInstance(response.data["error"], str)
		provider.assert_called_once()

	@patch("market.views.get_forex_latest_price")
	def test_forex_latest_price_uses_provider_service(self, provider):
		provider.return_value = {"symbol": "EUR/USD", "price": 1.08, "timestamp": None}

		response = self.client.get("/api/market/forex/latest_price/?symbol=eur%2Fusd")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["price"], 1.08)
		provider.assert_called_once_with("EUR/USD")

	@patch("market.views.get_forex_latest_price")
	def test_forex_symbol_alias_is_normalized_before_provider_call(self, provider):
		provider.return_value = {"symbol": "EUR/USD", "price": 1.08, "timestamp": None}

		response = self.client.get("/api/market/forex/latest_price/?symbol=eur_usd")

		self.assertEqual(response.status_code, 200)
		provider.assert_called_once_with("EUR/USD")

	@patch("market.views.get_forex_latest_price", side_effect=ProviderError("unsupported_symbol_or_interval", 400))
	def test_forex_symbol_alias_retries_do_not_repeat_provider_calls(self, provider):
		responses = [
			self.client.get("/api/market/forex/latest_price/?symbol=EUR%2FUSD"),
			self.client.get("/api/market/forex/latest_price/?symbol=EURUSD"),
			self.client.get("/api/market/forex/latest_price/?symbol=EUR_USD"),
		]

		self.assertEqual([response.status_code for response in responses], [400, 400, 400])
		provider.assert_called_once_with("EUR/USD")

	@patch("market.views.get_forex_candles")
	def test_forex_limit_uses_twelvedata_maximum(self, provider):
		provider.return_value = {"symbol": "EUR/USD", "interval": "1h", "candles": []}

		response = self.client.get("/api/market/forex/?symbol=EURUSD&limit=5000")

		self.assertEqual(response.status_code, 200)
		provider.assert_called_once_with("EUR/USD", "1h", 5000)

	@patch("market.views.get_crypto_candles", side_effect=ProviderError("provider_timeout"))
	def test_provider_failure_is_sanitized(self, provider):
		response = self.client.get("/api/market/crypto/?symbol=BTCUSDT")

		self.assertEqual(response.status_code, 504)
		self.assertEqual(response.data["code"], "provider_timeout")
		self.assertNotIn("apikey", str(response.data).lower())
		provider.assert_called_once()

	@patch("market.views.get_crypto_candles", side_effect=RuntimeError("secret-provider-detail"))
	def test_unexpected_provider_error_does_not_leak(self, provider):
		response = self.client.get("/api/market/crypto/?symbol=BTCUSDT")

		self.assertEqual(response.status_code, 502)
		self.assertNotIn("secret-provider-detail", str(response.data))
		provider.assert_called_once()

	@patch("market.views.get_crypto_candles", return_value={"candles": []})
	def test_market_endpoint_is_throttled(self, provider):
		with patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"market_data": "1/minute"}):
			cache.clear()
			first = self.client.get("/api/market/crypto/?symbol=BTCUSDT")
			second = self.client.get("/api/market/crypto/?symbol=ETHUSDT")

		self.assertEqual(first.status_code, 200)
		self.assertEqual(second.status_code, 429)
		provider.assert_called_once()

	@patch("market.views.get_crypto_candles", return_value={"candles": []})
	def test_configured_anonymous_rate_limits_market_requests(self, provider):
		with patch.object(AnonRateThrottle, "THROTTLE_RATES", {"anon": "1/minute"}):
			cache.clear()
			first = self.client.get("/api/market/crypto/?symbol=BTCUSDT")
			second = self.client.get("/api/market/crypto/?symbol=ETHUSDT")

		self.assertEqual(first.status_code, 200)
		self.assertEqual(second.status_code, 429)
		provider.assert_called_once()


class ProviderServiceTests(TestCase):
	@patch("market.services.binance_service.get_json")
	def test_binance_candles_are_sorted_normalized_and_limited(self, get_json_mock):
		get_json_mock.return_value = [
			[1700003600000, "2", "3", "1", "2.5", "10"],
			[1700000000000, "1", "2", "0.5", "1.5", "5"],
		]

		result = get_crypto_candles("btcusdt", "1h", limit=1)

		self.assertEqual(result["symbol"], "BTCUSDT")
		self.assertEqual(len(result["candles"]), 1)
		self.assertEqual(result["candles"][0]["time"], 1700003600)
		self.assertEqual(result["candles"][0]["volume"], 10.0)
		get_json_mock.assert_called_once()
		self.assertEqual(get_json_mock.call_args.kwargs["params"]["limit"], 1)

	@patch("market.services.binance_service.get_json", return_value=[
		[1700000000000, "2", "1", "0.5", "1.5", "5"],
	])
	def test_invalid_ohlc_from_binance_is_rejected(self, get_json_mock):
		with self.assertRaises(ProviderError) as raised:
			get_crypto_candles("BTCUSDT", "1h")
		self.assertEqual(raised.exception.code, "invalid_provider_data")
		get_json_mock.assert_called_once()

	@override_settings(TWELVEDATA_KEY="test-key")
	@patch("market.services.forex_service.get_json")
	def test_twelvedata_interval_mapping_and_utc_time(self, get_json_mock):
		get_json_mock.return_value = {
			"meta": {"exchange_timezone": "America/New_York"},
			"values": [
				{"datetime": "2025-01-02 00:00:00", "open": "1.1", "high": "1.2", "low": "1.0", "close": "1.15"},
				{"datetime": "2025-01-01 00:00:00", "open": "1.0", "high": "1.2", "low": "0.9", "close": "1.1"},
			]
		}
		expected = int(datetime(2025, 1, 1, 5, tzinfo=timezone.utc).timestamp())

		for interval, provider_interval in (("1d", "1day"), ("1w", "1week"), ("1M", "1month")):
			with self.subTest(interval=interval):
				result = get_forex_candles("EUR/USD", interval, limit=10)
				self.assertEqual(result["candles"][0]["time"], expected)
				self.assertEqual(get_json_mock.call_args.kwargs["params"]["interval"], provider_interval)
				self.assertNotIn("timezone", get_json_mock.call_args.kwargs["params"])

	@override_settings(TWELVEDATA_KEY="test-key")
	@patch("market.services.forex_service.get_json", return_value={
		"meta": {"exchange_timezone": "America/New_York"},
		"values": [
			{"datetime": "2025-03-10 00:00:00", "open": "1", "high": "2", "low": "0.5", "close": "1.5"},
			{"datetime": "2025-03-09 00:00:00", "open": "1", "high": "2", "low": "0.5", "close": "1.5"},
		],
	})
	def test_daily_forex_candles_use_dst_aware_exchange_timezone(self, get_json_mock):
		result = get_forex_candles("EUR/USD", "1d")
		candles = result["candles"]

		self.assertEqual(candles[1]["time"] - candles[0]["time"], 23 * 60 * 60)

	@override_settings(TWELVEDATA_KEY="test-key")
	@patch("market.services.forex_service.get_json", return_value={
		"meta": {"exchange_timezone": "America/New_York"},
		"values": [{"datetime": "2025-01-01 12:00:00", "open": "1", "high": "2", "low": "0.5", "close": "1.5"}],
	})
	def test_intraday_forex_explicitly_requests_utc(self, get_json_mock):
		get_forex_candles("EUR/USD", "1h")
		self.assertEqual(get_json_mock.call_args.kwargs["params"]["timezone"], "UTC")

	@override_settings(TWELVEDATA_KEY="test-key")
	@patch("market.services.forex_service.get_json")
	def test_calendar_interval_requires_provider_timezone_metadata(self, get_json_mock):
		get_json_mock.return_value = {"values": [{"datetime": "2025-01-01", "open": "1", "high": "2", "low": "0.5", "close": "1.5"}]}

		with self.assertRaises(ProviderError) as raised:
			get_forex_candles("EUR/USD", "1d")

		self.assertEqual(raised.exception.code, "invalid_provider_response")

	@override_settings(TWELVEDATA_KEY="test-key")
	@patch("market.services.forex_service.get_json", return_value={"values": []})
	def test_empty_forex_response_is_a_valid_empty_candle_list(self, get_json_mock):
		result = get_forex_candles("EUR/USD", "1h")
		self.assertEqual(result["candles"], [])
		get_json_mock.assert_called_once()

	@override_settings(TWELVEDATA_KEY="test-key")
	@patch("market.services.forex_service.get_json", return_value={"values": []})
	def test_empty_calendar_forex_response_needs_no_timezone_metadata(self, get_json_mock):
		result = get_forex_candles("EUR/USD", "1d")
		self.assertEqual(result["candles"], [])
		get_json_mock.assert_called_once()

	@override_settings(TWELVEDATA_KEY="test-key")
	@patch("market.services.forex_service.get_json", return_value={
		"code": 429,
		"message": "private provider quota detail",
		"status": "error",
	})
	def test_twelvedata_json_quota_error_is_rate_limited_and_sanitized(self, get_json_mock):
		with self.assertRaises(ProviderError) as raised:
			get_forex_candles("EUR/USD", "1h")

		self.assertEqual(raised.exception.code, "provider_rate_limited")
		self.assertNotIn("private provider quota detail", str(raised.exception))
		get_json_mock.assert_called_once()

	def test_timestamp_normalizer_rejects_implausibly_distant_values(self):
		with self.assertRaises(ProviderError) as raised:
			timestamp_to_seconds(10_000_000_000_000)

		self.assertEqual(raised.exception.code, "invalid_provider_data")

	def test_timestamp_normalizer_converts_millisecond_boundary(self):
		self.assertEqual(timestamp_to_seconds(1_000_000_000_000), 1_000_000_000)


class ProviderHTTPTests(TestCase):
	def test_retries_are_bounded_and_get_only(self):
		session = create_session()
		try:
			retry = session.adapters["https://"].max_retries
			self.assertEqual(retry.total, 2)
			self.assertEqual(retry.allowed_methods, frozenset({"GET"}))
		finally:
			session.close()

	@patch("market.services.http.create_session")
	def test_timeout_is_translated_and_session_closed(self, create_session_mock):
		session = create_session_mock.return_value
		session.get.side_effect = requests.Timeout()

		with self.assertRaises(ProviderError) as raised:
			get_json("https://provider.invalid/data")

		self.assertEqual(raised.exception.code, "provider_timeout")
		session.close.assert_called_once()

	@patch("market.services.http.create_session")
	def test_malformed_json_is_translated(self, create_session_mock):
		response = create_session_mock.return_value.get.return_value
		response.status_code = 200
		response.json.side_effect = ValueError("private payload")

		with self.assertRaises(ProviderError) as raised:
			get_json("https://provider.invalid/data")

		self.assertEqual(raised.exception.code, "invalid_provider_response")

	@patch("market.services.http.create_session")
	def test_provider_rate_limit_is_not_retried_or_exposed(self, create_session_mock):
		response = create_session_mock.return_value.get.return_value
		response.status_code = 429

		with self.assertRaises(ProviderError) as raised:
			get_json("https://provider.invalid/data")

		self.assertEqual(raised.exception.code, "provider_rate_limited")
		response.raise_for_status.assert_not_called()

	@patch("market.services.http.create_session")
	def test_exhausted_request_retries_are_translated(self, create_session_mock):
		session = create_session_mock.return_value
		session.get.side_effect = requests.exceptions.RetryError("private provider URL")

		with self.assertRaises(ProviderError) as raised:
			get_json("https://provider.invalid/data")

		self.assertEqual(raised.exception.code, "provider_unavailable")
		session.close.assert_called_once()


class BackendConfigurationTests(TestCase):
	@patch.dict(os.environ, {"TEST_BOOL": "on", "TEST_LIST": " one, ,two "})
	def test_environment_parsers_normalize_values(self):
		self.assertTrue(env_bool("TEST_BOOL", False))
		self.assertEqual(env_list("TEST_LIST"), ["one", "two"])
		self.assertFalse(env_bool("TEST_BOOL_UNSET", False))

	@override_settings(
		DEBUG=False,
		SECRET_KEY="a-production-test-secret-key-that-is-long-and-not-a-placeholder-value",
		ALLOWED_HOSTS=["example.com"],
		SECURE_SSL_REDIRECT=True,
		SESSION_COOKIE_SECURE=True,
		CSRF_COOKIE_SECURE=True,
		SECURE_HSTS_SECONDS=31536000,
		SECURE_HSTS_INCLUDE_SUBDOMAINS=True,
		SECURE_HSTS_PRELOAD=True,
	)
	def test_deployment_security_check_passes_for_explicit_secure_settings(self):
		output = StringIO()
		call_command("check", deploy=True, fail_level="WARNING", stdout=output, stderr=output)
		self.assertIn("System check identified no issues", output.getvalue())
