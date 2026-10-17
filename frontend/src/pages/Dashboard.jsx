import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChartContainer from "../components/ChartContainer";
import NotesPanel from "../components/NotesPanel";
import IntervalSelector from "../components/IntervalSelector";
import SymbolPicker from "../components/SymbolPicker";

export default function Dashboard() {
  const [market, setMarket] = useState("crypto");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1h");
  const [activePrice, setActivePrice] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState("chart");

  const [searchOpen, setSearchOpen] = useState(false);
  const searchButtonRef = useRef(null);

  const selectPanel = (panel) => {
    if (panel !== activePanel) {
      window.dispatchEvent(new CustomEvent("tvmini:tool:selected", { detail: { tool: null } }));
    }
    setActivePanel(panel);
  };

  const handleSelect = (type, sym) => {
    window.dispatchEvent(new CustomEvent("tvmini:tool:selected", { detail: { tool: null } }));
    setMarket(type);
    setSymbol(sym);
    setActivePrice(null);
    setActivePanel("chart");
    setSearchOpen(false);
  };

  // بستن sidebar با Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  return (
    <div className="min-h-dvh w-full max-w-full flex flex-col overflow-x-hidden bg-[#0a0e12] text-gray-100 rtl">
      <Header
        searchButtonRef={searchButtonRef}
        onToggleSidebar={() => {
          if (window.matchMedia("(min-width: 1024px)").matches) {
            setSidebarOpen((isOpen) => !isOpen);
          } else {
            selectPanel(activePanel === "watchlist" ? "chart" : "watchlist");
          }
        }}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <SymbolPicker
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSelect}
        selectedSymbol={symbol}
        selectedMarket={market}
      />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-800 bg-[#0c131a] px-3 py-2 text-sm sm:px-4">
        <div className="min-w-0 text-gray-300">
          <strong className="font-semibold text-white">{symbol}</strong>{" "}
          <span className="text-xs text-gray-400">• {market}</span>
        </div>
        <div className="w-full min-w-0 sm:w-auto">
          <IntervalSelector value={interval} onChange={setInterval} />
        </div>
      </div>

      <nav aria-label="Workspace panels" className="grid grid-cols-3 gap-1 border-b border-gray-800 bg-[#0b0f14] p-2 lg:hidden">
        {[
          ["chart", "Chart"],
          ["watchlist", "Watchlist"],
          ["notes", "Notes"],
        ].map(([panel, label]) => (
          <button
            key={panel}
            type="button"
            aria-pressed={activePanel === panel}
            onClick={() => selectPanel(panel)}
            className={`min-h-11 rounded px-3 py-2 text-sm ${activePanel === panel ? "border border-sky-400 bg-[#14212b] text-white" : "border border-gray-700 bg-[#0b0f14] text-gray-300 hover:bg-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="flex min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        <div
          className={`${activePanel === "watchlist" ? "flex" : "hidden"} ${sidebarOpen ? "lg:flex lg:w-56" : "lg:hidden"} w-full min-w-0 flex-none overflow-hidden border-r border-gray-800 bg-[#0b1016]`}
        >
          <div className="h-full w-full min-w-0">
            <Sidebar
              onSelectSymbol={handleSelect}
              activeSymbol={symbol}
              activeMarket={market}
              activePrice={activePrice}
              onOpenSearch={() => setSearchOpen(true)}
            />
          </div>
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            className={`${activePanel === "chart" ? "flex" : "hidden"} lg:flex min-h-0 min-w-0 flex-1 flex-col p-2 sm:p-3`}
          >
            <ChartContainer
              marketType={market}
              symbol={symbol}
              interval={interval}
              onLivePrice={setActivePrice}
              key={`${market}-${symbol}-${interval}`}
            />
          </div>

          <div
            className={`${activePanel === "notes" ? "flex" : "hidden"} lg:flex min-h-0 w-full min-w-0 flex-1 flex-col border-l border-gray-800 bg-[#0b0f14] lg:w-72 lg:flex-none xl:w-80`}
          >
            <NotesPanel activeSymbol={symbol} />
          </div>
        </main>
      </div>
    </div>
  );
}
