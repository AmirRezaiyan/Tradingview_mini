import React, { useEffect, useState } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // کنترل modal جستجو
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSelect = (type, sym) => {
    setMarket(type);
    setSymbol(sym);
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
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-[#0a0e12] to-[#10151b] text-gray-100 rtl transition-colors duration-700">
      {/* Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* SymbolPicker modal */}
      <SymbolPicker
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(type, sym) => handleSelect(type, sym)}
      />

      {/* Top Info Bar */}
      <div className="px-4 py-3 flex items-center gap-4 bg-[#0c131a]/70 border-b border-gray-800 backdrop-blur-md text-sm transition-all duration-500">
        <div className="text-gray-300 tracking-wide">
          <strong className="text-white font-semibold">{symbol}</strong>{" "}
          <span className="text-xs text-gray-400">• {market}</span>
        </div>
        <div className="ml-4">
          <IntervalSelector value={interval} onChange={setInterval} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`transition-all duration-500 ease-in-out transform ${
            sidebarOpen ? "translate-x-0 opacity-100 w-64" : "-translate-x-72 opacity-0 w-64"
          } bg-[#0b1016] border-r border-gray-800 shadow-inner`}
          style={{ overflow: "hidden" }}
        >
          <div className="h-full">
            <Sidebar
              onSelectSymbol={handleSelect}
              activeSymbol={symbol}
              activeMarket={market}
              onOpenSearch={() => setSearchOpen(true)} 
            />
          </div>
        </div>

        {/* Main Chart + Notes */}
        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 p-3 animate-fadeInSlow">
            <ChartContainer
              marketType={market}
              symbol={symbol}
              interval={interval}
              key={`${market}-${symbol}-${interval}`}
            />
          </div>

          <div className="w-[320px] bg-[#0b0f14]/90 border-l border-gray-800 shadow-lg animate-fadeIn delay-300">
            <NotesPanel activeSymbol={symbol} />
          </div>
        </main>
      </div>
    </div>
  );
}
