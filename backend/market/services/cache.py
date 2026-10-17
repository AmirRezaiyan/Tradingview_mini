import logging

from django.core.cache import cache

from .http import ProviderError


logger = logging.getLogger(__name__)


def cached_market_call(key, timeout, loader):
    try:
        value = cache.get(key)
    except Exception:
        logger.warning("Market-data cache read failed; querying provider.")
        value = None
    if value is not None:
        if isinstance(value, dict) and value.get("__provider_error__"):
            raise ProviderError(value["__provider_error__"], status_code=value.get("status_code"))
        return value

    try:
        value = loader()
    except ProviderError as error:
        if error.code == "unsupported_symbol_or_interval" and timeout > 0:
            try:
                cache.set(
                    key,
                    {"__provider_error__": error.code, "status_code": error.status_code},
                    timeout=min(timeout, 30),
                )
            except Exception:
                logger.warning("Market-data negative-cache write failed.")
        raise
    try:
        cache.set(key, value, timeout=timeout)
    except Exception:
        logger.warning("Market-data cache write failed.")
    return value