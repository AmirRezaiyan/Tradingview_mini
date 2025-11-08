import React, { useEffect, useState, useRef } from "react";
import { FaTimes, FaSearch, FaStar, FaRegStar } from "react-icons/fa";
import axios from "axios";

const LS_KEY = "tvmini:favorites_v1";

const FALLBACK_CRYPTO = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", "XRPUSDT", "DOGEUSDT",
  "LTCUSDT", "MATICUSDT", "DOTUSDT"
];

const FALLBACK_FOREX = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD"
];

function loadFavorites() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveFavorites(arr) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
    // broadcast to other components
    window.dispatchEvent(new Event("tvmini:favorites:updated"));
  } catch (e) {}
}

export default function SymbolPicker({ open, onClose, onSelect }) {
  const [tab, setTab] = useState("crypto"); // crypto | forex
  const [loading, setLoading] = useState(false);
  const [symbols, setSymbols] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setTab("crypto");
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let res;
        try {
          res = await axios.get(`http://127.0.0.1:8000/api/market/symbols/`, { timeout: 3000 });
        } catch (e) {}
        if (res?.data?.crypto && !cancelled) {
          setSymbols(tab === "crypto" ? res.data.crypto : (res.data.forex || []));
          setLoading(false);
          return;
        }

        try {
          const r2 = await axios.get(`http://127.0.0.1:8000/api/market/${tab}/symbols/`, { timeout: 3000 });
          if (!cancelled && Array.isArray(r2.data)) {
            setSymbols(r2.data);
            setLoading(false);
            return;
          }
        } catch (e) {}

        if (!cancelled) setSymbols(tab === "crypto" ? FALLBACK_CRYPTO : FALLBACK_FOREX);
      } catch (err) {
        if (!cancelled) setError("Failed to load symbols");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, tab]);

  const filtered = symbols.filter(s => s.toLowerCase().includes(query.trim().toLowerCase()));

  const handleSelect = (sym) => {
    onSelect(tab, sym);
    onClose();
  };

  const isFav = (sym) => {
    const fav = loadFavorites();
    return fav.some(f => f.market === tab && f.symbol === sym);
  };

  const toggleFavorite = (sym) => {
    const fav = loadFavorites();
    const idx = fav.findIndex(f => f.market === tab && f.symbol === sym);
    if (idx >= 0) {
      fav.splice(idx, 1);
    } else {
      fav.unshift({ market: tab, symbol: sym });
    }
    saveFavorites(fav);
    // force re-render to update icon
    setSymbols((s) => [...s]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-2xl bg-[#071017] border border-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 p-3 border-b border-gray-800">
          <div className="flex items-center gap-2 px-2 py-1 bg-[#0b1217] rounded">
            <FaSearch />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${tab === "crypto" ? "crypto symbols (e.g. BTCUSDT)" : "forex pairs (e.g. EUR/USD)"}`}
              className="bg-transparent outline-none text-sm text-gray-200 placeholder-gray-500 w-80"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs text-gray-400 mr-2">Type:</div>
            <button
              className={`px-3 py-1 rounded text-sm ${tab === "crypto" ? "bg-[#0f1720]" : "hover:bg-[#0f1720]"}`}
              onClick={() => setTab("crypto")}
            >
              Crypto
            </button>
            <button
              className={`px-3 py-1 rounded text-sm ${tab === "forex" ? "bg-[#0f1720]" : "hover:bg-[#0f1720]"}`}
              onClick={() => setTab("forex")}
            >
              Forex
            </button>

            {/* <button onClick={onClose} className="p-2 rounded hover:bg-gray-800">
              <FaTimes />
            </button> */}
          </div>
        </div>

        <div className="max-h-80 overflow-auto">
          {loading && <div className="p-4 text-sm text-gray-400">Loading symbols…</div>}
          {!loading && !filtered.length && (
            <div className="p-4 text-sm text-gray-500">No symbols match your search.</div>
          )}

          {!loading && filtered.length > 0 && (
            <ul className="divide-y divide-gray-800">
              {filtered.map((s) => (
                <li key={s} className="p-3 hover:bg-[#0f1720] cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-200">{s}</div>
                    <div className="text-xs text-gray-400">• {tab}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(s)}
                      title={isFav(s) ? "Remove from favorites" : "Add to favorites"}
                      className="p-1 rounded hover:bg-[#112022]"
                    >
                      {isFav(s) ? <FaStar className="text-yellow-400" /> : <FaRegStar className="text-gray-400" />}
                    </button>

                    <button
                      onClick={() => handleSelect(s)}
                      className="text-xs px-2 py-1 bg-[#0b7] bg-opacity-10 border border-green-600 rounded text-green-300"
                    >
                      Open
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* <div className="p-3 border-t border-gray-800 text-xs text-gray-400">
          Tip: click the star to add/remove favorite. Favorites are stored locally.
        </div> */}
      </div>
    </div>
  );
}
