
import React, { useEffect, useState, useRef } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

const LS_KEY = "tvmini:favorites_v1";
const FAVORITES_UPDATED_EVENT = "tvmini:favorites:updated";

const CURATED_CRYPTO_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "ADAUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "LTCUSDT",
  "MATICUSDT",
  "DOTUSDT",
];

const CURATED_FOREX_SYMBOLS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CAD",
  "USD/CHF",
  "NZD/USD",
];

function loadFavorites() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const favorites = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(favorites)) {
      return [];
    }

    return favorites.filter(
      (favorite) =>
        favorite &&
        typeof favorite.market === "string" &&
        typeof favorite.symbol === "string"
    );
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(favorites));

    // Notify components in the same browser tab.
    window.dispatchEvent(
      new Event(FAVORITES_UPDATED_EVENT)
    );
  } catch (error) {
    console.warn("Failed to save favorites:", error);
  }
}

export default function SymbolPicker({
  open,
  onClose,
  onSelect,
  selectedSymbol,
  selectedMarket,
}) {
  const [tab, setTab] = useState("crypto");
  const [query, setQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [favorites, setFavorites] = useState(loadFavorites);

  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  // Handle opening, keyboard navigation, and focus management.
  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;

    setQuery("");
    setTab("crypto");
    setActiveResultIndex(0);

    const focusTimeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimeout);
      document.removeEventListener("keydown", handleKeyDown);

      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  // Keep favorites synchronized with Sidebar and other components.
  useEffect(() => {
    const syncFavorites = () => {
      setFavorites(loadFavorites());
    };

    const handleStorage = (event) => {
      if (
        event.key === LS_KEY ||
        event.key === null
      ) {
        syncFavorites();
      }
    };

    // Changes made in the same tab, including Sidebar removals.
    window.addEventListener(
      FAVORITES_UPDATED_EVENT,
      syncFavorites
    );

    // Changes made in other tabs.
    window.addEventListener("storage", handleStorage);

    // Read the latest value when this component mounts.
    syncFavorites();

    return () => {
      window.removeEventListener(
        FAVORITES_UPDATED_EVENT,
        syncFavorites
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  const symbols =
    tab === "crypto"
      ? CURATED_CRYPTO_SYMBOLS
      : CURATED_FOREX_SYMBOLS;

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = symbols.filter((symbol) =>
    symbol.toLowerCase().includes(normalizedQuery)
  );

  // Keep keyboard selection inside the current result list.
  useEffect(() => {
    setActiveResultIndex((index) =>
      filtered.length
        ? Math.min(index, filtered.length - 1)
        : 0
    );
  }, [normalizedQuery, tab, filtered.length]);

  const handleSelect = (symbol) => {
    onSelect(tab, symbol);
    onClose();
  };

  const isFav = (symbol) => {
    return favorites.some(
      (favorite) =>
        favorite.market === tab &&
        favorite.symbol === symbol
    );
  };

  const toggleFavorite = (symbol) => {
    const exists = favorites.some(
      (favorite) =>
        favorite.market === tab &&
        favorite.symbol === symbol
    );

    const nextFavorites = exists
      ? favorites.filter(
          (favorite) =>
            !(
              favorite.market === tab &&
              favorite.symbol === symbol
            )
        )
      : [
          { market: tab, symbol },
          ...favorites,
        ];

    setFavorites(nextFavorites);
    saveFavorites(nextFavorites);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "ArrowDown" && filtered.length) {
      event.preventDefault();

      setActiveResultIndex(
        (index) => (index + 1) % filtered.length
      );
    } else if (
      event.key === "ArrowUp" &&
      filtered.length
    ) {
      event.preventDefault();

      setActiveResultIndex(
        (index) =>
          (index - 1 + filtered.length) %
          filtered.length
      );
    } else if (
      event.key === "Enter" &&
      filtered[activeResultIndex]
    ) {
      event.preventDefault();
      handleSelect(filtered[activeResultIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="symbol-picker-title"
        tabIndex={-1}
        className="relative my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-gray-700 bg-[#071017] shadow-xl sm:max-h-[calc(100dvh-2rem)]"
      >
        {/* Search header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 p-3">
          <h2
            id="symbol-picker-title"
            className="sr-only"
          >
            Search and select a market symbol
          </h2>

          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded bg-[#0b1217] px-2 py-1">
            <FaSearch
              aria-hidden="true"
              className="shrink-0 text-gray-300"
            />

            <input
              ref={inputRef}
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              onKeyDown={handleSearchKeyDown}
              aria-label={`Search ${
                tab === "crypto"
                  ? "crypto symbols"
                  : "forex pairs"
              }`}
              aria-describedby="symbol-search-status"
              aria-keyshortcuts="ArrowDown ArrowUp Enter"
              role="searchbox"
              placeholder={`Search ${
                tab === "crypto"
                  ? "crypto symbols (e.g. BTCUSDT)"
                  : "forex pairs (e.g. EUR/USD)"
              }`}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveResultIndex(0);
                  inputRef.current?.focus();
                }}
                aria-label="Clear symbol search"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-gray-200 hover:bg-gray-700"
              >
                <FaTimes aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Market tabs */}
          <div
            role="group"
            aria-label="Market type"
            className="flex items-center gap-1"
          >
            <button
              type="button"
              className={`min-h-11 rounded px-3 py-2 text-sm ${
                tab === "crypto"
                  ? "border border-sky-300 bg-[#18313d] text-white"
                  : "border border-gray-700 text-gray-200 hover:bg-[#0f1720]"
              }`}
              onClick={() => {
                setTab("crypto");
                setQuery("");
                setActiveResultIndex(0);
              }}
              aria-pressed={tab === "crypto"}
            >
              Crypto
            </button>

            <button
              type="button"
              className={`min-h-11 rounded px-3 py-2 text-sm ${
                tab === "forex"
                  ? "border border-sky-300 bg-[#18313d] text-white"
                  : "border border-gray-700 text-gray-200 hover:bg-[#0f1720]"
              }`}
              onClick={() => {
                setTab("forex");
                setQuery("");
                setActiveResultIndex(0);
              }}
              aria-pressed={tab === "forex"}
            >
              Forex
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close symbol search"
            className="flex h-11 w-11 items-center justify-center rounded border border-gray-700 text-gray-200 hover:bg-gray-800"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        {/* Search results */}
        <div className="min-h-0 overflow-auto">
          <div
            id="symbol-search-status"
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {filtered.length
              ? `${filtered.length} results. Highlighted ${
                  filtered[activeResultIndex]
                }. Use up and down arrows, then Enter to open.`
              : "No matching curated symbols."}
          </div>

          {!filtered.length && (
            <div
              className="p-4 text-sm text-gray-300"
              role="status"
              aria-live="polite"
            >
              No curated symbols match this search. Try a
              ticker such as BTCUSDT or EUR/USD.
            </div>
          )}

          {filtered.length > 0 && (
            <ul
              id="symbol-search-results"
              aria-label="Symbol results"
              className="divide-y divide-gray-800"
            >
              {filtered.map((symbol, index) => {
                const isCurrent =
                  selectedMarket === tab &&
                  selectedSymbol?.toUpperCase() ===
                    symbol.toUpperCase();

                const favorite = isFav(symbol);

                return (
                  <li
                    key={symbol}
                    id={`symbol-result-${index}`}
                    aria-current={
                      isCurrent ? "true" : undefined
                    }
                    className={`flex min-h-14 min-w-0 items-center justify-between gap-2 border-b p-3 hover:bg-[#0f1720] ${
                      index === activeResultIndex
                        ? "border-sky-400 bg-[#10202b]"
                        : "border-gray-800"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <div className="truncate text-sm text-gray-100">
                        {symbol}
                      </div>

                      <div className="shrink-0 text-xs text-gray-400">
                        • {tab}
                      </div>

                      {isCurrent && (
                        <span className="shrink-0 rounded border border-sky-400 px-1.5 py-0.5 text-xs text-sky-200">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          toggleFavorite(symbol)
                        }
                        title={
                          favorite
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        aria-label={
                          favorite
                            ? `Remove ${symbol} from favorites`
                            : `Add ${symbol} to favorites`
                        }
                        aria-pressed={favorite}
                        className={`flex h-10 w-10 items-center justify-center rounded text-xl leading-none transition-colors hover:bg-[#112022] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${
                          favorite
                            ? "text-yellow-300"
                            : "text-gray-300"
                        }`}
                      >
                        <span aria-hidden="true">
                          {favorite ? "★" : "☆"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(symbol)}
                        onFocus={() =>
                          setActiveResultIndex(index)
                        }
                        className="min-h-10 rounded border border-green-500 bg-[#0b332a] px-3 py-2 text-xs text-green-100 hover:bg-[#104438] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                      >
                        Open
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-800 px-3 py-3 text-xs text-gray-300">
          Curated shortlist; actual symbol availability
          depends on the market-data provider.
        </div>
      </div>
    </div>
  );
}
