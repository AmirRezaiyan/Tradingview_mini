
import React, { useCallback, useEffect, useState } from "react";

const LS_KEY = "tvmini:favorites_v1";
const UPDATED_EVENT = "tvmini:favorites:updated";

function readFavorites() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        typeof item.symbol === "string" &&
        item.symbol.trim() &&
        typeof item.market === "string" &&
        item.market.trim()
    );
  } catch {
    return [];
  }
}

export default function Sidebar({
  onSelectSymbol,
  activeSymbol,
  activeMarket,
  activePrice,
  onOpenSearch,
}) {
  const [favorites, setFavorites] = useState([]);

  const refreshFavorites = useCallback(() => {
    setFavorites(readFavorites());
  }, []);

  useEffect(() => {
    refreshFavorites();

    const handleStorage = (event) => {
      if (event.key === LS_KEY || event.key === null) {
        refreshFavorites();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(UPDATED_EVENT, refreshFavorites);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(UPDATED_EVENT, refreshFavorites);
    };
  }, [refreshFavorites]);

  const persistFavorites = (next) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(UPDATED_EVENT));
    } catch (error) {
      console.error("Could not save favorites:", error);
    }
  };

  const addActiveToFavorites = () => {
    if (!activeSymbol) return;

    const entry = {
      market: activeMarket || "crypto",
      symbol: activeSymbol,
    };

    const exists = favorites.some(
      (item) =>
        item.market === entry.market &&
        item.symbol === entry.symbol
    );

    if (exists) return;

    const next = [entry, ...favorites];
    setFavorites(next);
    persistFavorites(next);
  };

  const removeFavorite = (symbol, market) => {
    const next = favorites.filter(
      (item) =>
        !(item.symbol === symbol && item.market === market)
    );

    setFavorites(next);
    persistFavorites(next);
  };

  const handleAddClick = () => {
    if (typeof onOpenSearch === "function") {
      onOpenSearch();
      return;
    }

    addActiveToFavorites();
  };

  const handleSelectSymbol = (market, symbol) => {
    if (typeof onSelectSymbol === "function") {
      onSelectSymbol(market, symbol);
    }
  };

  return (
    <aside
      aria-label="Watchlist"
      className="
        flex h-full min-h-0 w-full min-w-0 max-w-full
        flex-col overflow-hidden
        bg-[#071018] p-2 text-gray-200
        sm:p-3
      "
    >
      {/* Header */}
      <header
        className="
          mb-3 flex min-w-0 shrink-0
          items-center justify-between gap-2
        "
      >
        <h3 className="truncate text-sm font-medium text-gray-300">
          Favorites
          <span className="ml-2 text-xs text-gray-500">
            {favorites.length}
          </span>
        </h3>

        <button
          type="button"
          onClick={handleAddClick}
          className="
            flex min-h-9 shrink-0 items-center justify-center
            rounded-md border border-gray-700 px-2.5
            text-xs text-gray-200
            transition-colors hover:bg-[#15212c]
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-sky-500
          "
          aria-label="Search symbols to add a favorite"
          title="Search symbols"
        >
          + Search
        </button>
      </header>

      {/* Scrollable favorites list */}
      <div
        className="
          min-h-0 min-w-0 flex-1
          overflow-x-hidden overflow-y-auto
          overscroll-contain
      "
      >
        {favorites.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-800 p-3 sm:p-4">
            <p className="text-xs leading-5 text-gray-400">
              No favorites yet.
            </p>
            <p className="mt-1 break-words text-xs leading-5 text-gray-500">
              Search for a symbol and use its star to save it here.
            </p>
          </div>
        ) : (
          <ul className="flex min-w-0 flex-col gap-1.5">
            {favorites.map((favorite) => {
              const isActive =
                activeSymbol === favorite.symbol &&
                activeMarket === favorite.market;

              const hasLivePrice =
                isActive && Number.isFinite(activePrice);

              return (
                <li
                  key={`${favorite.market}:${favorite.symbol}`}
                  className="
                    grid w-full min-w-0
                    grid-cols-[minmax(0,1fr)_auto]
                    items-center gap-1.5
                    overflow-hidden rounded-lg
                    border border-gray-800
                    bg-[#0b1118] p-1
                    transition-colors hover:border-gray-700
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectSymbol(
                        favorite.market,
                        favorite.symbol
                      )
                    }
                    aria-current={isActive ? "true" : undefined}
                    className={`
                      block min-h-0 w-full min-w-0
                      overflow-hidden rounded-md
                      px-2 py-2 text-left
                      transition-colors
                      hover:bg-[#121c26]
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-inset
                      focus-visible:ring-sky-500
                      ${
                        isActive
                          ? "bg-[#10202b] ring-1 ring-inset ring-sky-500/70"
                          : ""
                      }
                    `}
                  >
                    <div className="w-full min-w-0 overflow-hidden">
                      <div className="truncate text-sm font-semibold text-gray-100">
                        {favorite.symbol}
                      </div>

                      <div className="mt-0.5 truncate text-xs text-gray-400">
                        {favorite.market}
                      </div>

                      <div
                        className={`
                          mt-1 truncate text-xs tabular-nums
                          ${
                            hasLivePrice
                              ? "text-emerald-400"
                              : "text-gray-500"
                          }
                        `}
                        title={
                          hasLivePrice
                            ? `Live ${activePrice.toFixed(4)}`
                            : "Price unavailable"
                        }
                      >
                        {hasLivePrice
                          ? `Live ${activePrice.toFixed(4)}`
                          : "Price unavailable"}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      removeFavorite(
                        favorite.symbol,
                        favorite.market
                      )
                    }
                    className="
                      flex h-9 w-9 shrink-0
                      items-center justify-center
                      rounded-md text-lg leading-none
                      text-gray-500
                      transition-colors
                      hover:bg-red-950/60 hover:text-red-300
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-red-500
                    "
                    aria-label={`Remove ${favorite.symbol} from favorites`}
                    title={`Remove ${favorite.symbol}`}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <footer
        className="
          mt-3 shrink-0 border-t border-gray-800
          pt-2.5 text-[11px] leading-4 text-gray-500
          sm:pt-3 sm:text-xs
        "
      >
        <p className="break-words">
          Favorites are stored locally in your browser.
        </p>
      </footer>
    </aside>
  );
}
