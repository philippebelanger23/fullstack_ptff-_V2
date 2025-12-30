"""Cache management for market data."""

import pickle
from pathlib import Path
from constants import CACHE_DIR, CACHE_FILE


def load_cache():
    """Load cached market data if it exists."""
    cache_path = Path(CACHE_FILE)
    if cache_path.exists():
        try:
            with open(cache_path, 'rb') as f:
                return pickle.load(f)
        except Exception:
            return {}
    return {}


def save_cache(cache):
    """Save market data cache."""
    cache_dir = Path(CACHE_DIR)
    cache_dir.mkdir(exist_ok=True)
    cache_path = Path(CACHE_FILE)
    with open(cache_path, 'wb') as f:
        pickle.dump(cache, f)

