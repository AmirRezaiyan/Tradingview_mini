import logging

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)
DEFAULT_TIMEOUT = (3, 8)


class ProviderError(Exception):
    def __init__(self, code, status_code=None):
        self.code = code
        self.status_code = status_code
        super().__init__(code)


def create_session(retries=2, backoff_factor=0.25, status_forcelist=(500, 502, 503, 504)):
    session = requests.Session()
    retry = Retry(
        total=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods=frozenset({"GET"}),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def get_json(url, params=None, headers=None, timeout=DEFAULT_TIMEOUT):
    session = create_session()
    try:
        response = session.get(url, params=params, headers=headers, timeout=timeout)
        if response.status_code == 429:
            raise ProviderError("provider_rate_limited", status_code=429)
        try:
            response.raise_for_status()
        except requests.HTTPError:
            if response.status_code in (400, 404):
                raise ProviderError("unsupported_symbol_or_interval", status_code=response.status_code) from None
            raise ProviderError("provider_unavailable", status_code=response.status_code) from None
        try:
            return response.json()
        except (ValueError, requests.exceptions.JSONDecodeError):
            raise ProviderError("invalid_provider_response", status_code=502) from None
    except ProviderError:
        raise
    except requests.Timeout:
        raise ProviderError("provider_timeout", status_code=504) from None
    except requests.RequestException:
        raise ProviderError("provider_unavailable", status_code=502) from None
    finally:
        session.close()
