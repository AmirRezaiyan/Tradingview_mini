// src/components/Sidebar.jsx
import React, { useEffect, useState } from "react";

const LS_KEY = "tvmini:favorites_v1";
const DEBUG = false;

export default function Sidebar({
  onSelectSymbol,
  activeSymbol,
  activeMarket,
  onOpenSearch,
}) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    // load favorites on mount
    try {
      const raw = localStorage.getItem(LS_KEY);
      setFavorites(raw ? JSON.parse(raw) : []);
    } catch (err) {
      console.error(err);
      setFavorites([]);
    }

    // sync with other tabs
    const onStorage = (e) => {
      if (e.key === LS_KEY) {
        try {
          const val = e.newValue ? JSON.parse(e.newValue) : [];
          setFavorites(Array.isArray(val) ? val : []);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    // listen for SymbolPicker updates
    const onFavoritesUpdated = () => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        setFavorites(raw ? JSON.parse(raw) : []);
      } catch {
        setFavorites([]);
      }
    };
    window.addEventListener("tvmini:favorites:updated", onFavoritesUpdated);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tvmini:favorites:updated", onFavoritesUpdated);
    };
  }, []);

  const persistAndNotify = (next) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("tvmini:favorites:updated"));
      if (DEBUG) console.debug("persisted favorites", next);
    } catch {}
  };

  const addActiveToFav = () => {
    if (!activeSymbol) return;
    const entry = { market: activeMarket || "crypto", symbol: activeSymbol };
    if (favorites.some((f) => f.market === entry.market && f.symbol === entry.symbol)) return;
    const next = [entry, ...favorites];
    setFavorites(next);
    persistAndNotify(next);
  };

  const removeFav = (symbolToRemove, marketToRemove) => {
    const next = favorites.filter(
      (f) => !(f.symbol === symbolToRemove && f.market === marketToRemove)
    );
    setFavorites(next);
    persistAndNotify(next);
  };

  const handleAddClick = () => {
    if (typeof onOpenSearch === "function") {
      onOpenSearch();
    } else {
      addActiveToFav();
    }
  };

  return (
    <aside className="w-64 bg-[#071018] text-gray-200 p-4 border-r border-gray-800 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm text-gray-400">Favorites</h3>
        <button
          onClick={handleAddClick}
          className="text-xs text-gray-300 px-2 py-1 rounded hover:bg-[#0f1720]"
          title="Add current symbol to favorites or open symbol search"
        >
          + Add
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {favorites.length === 0 ? (
          <div className="text-xs text-gray-500">
            No favorites yet. Open a symbol and click + Add or use the star in search.
          </div>
        ) : (
          <ul className="space-y-2">
            {favorites.map((f) => (
              <li
                key={`${f.market}:${f.symbol}`}
                className="flex items-center justify-between px-1"
              >
                <button
                  onClick={() => onSelectSymbol(f.market, f.symbol)}
                  className="text-left w-full py-2 px-2 rounded hover:bg-[#0f1720] text-sm text-gray-200"
                >
                  <div className="truncate">
                    <span className="font-medium">{f.symbol}</span>
                    <span className="ml-2 text-xs text-gray-400">• {f.market}</span>
                  </div>
                </button>

                <button
                  onClick={() => removeFav(f.symbol, f.market)}
                  className="ml-2 text-xs text-red-400 px-2 py-1 rounded hover:bg-[#2a0b0b]"
                  title="Remove favorite"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500 border-t border-gray-800 pt-3">
        Favorites are stored locally in your browser.
      </div>
    </aside>
  );
}
