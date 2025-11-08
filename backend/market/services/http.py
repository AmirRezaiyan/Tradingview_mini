# helper HTTP session with retries and timeout
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

DEFAULT_TIMEOUT = 10  # seconds

def create_session(retries=3, backoff_factor=0.3, status_forcelist=(500,502,503,504)):
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods=frozenset(['GET','POST'])
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('https://', adapter)
    session.mount('http://', adapter)
    return session

def get_json(url, params=None, headers=None, timeout=DEFAULT_TIMEOUT):
    s = create_session()
    resp = s.get(url, params=params, headers=headers, timeout=timeout)
    resp.raise_for_status()
    return resp.json()
