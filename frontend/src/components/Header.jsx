import React from "react";
import { FaBars, FaSearch } from "react-icons/fa";

export default function Header({ onToggleSidebar, onOpenSearch }) {
  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-[#0b0f14] text-gray-100 border-b border-gray-800 shadow-md">
      {/* Left: Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-md hover:bg-gray-800 transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        <FaBars className="w-5 h-5 text-gray-300" />
      </button>

      {/* Center: Search button */}
      <div className="flex-1 flex justify-center px-2">
        <button
          onClick={onOpenSearch}
          className="w-full max-w-md md:max-w-lg flex items-center justify-center gap-3 py-2 px-4 
                     rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 text-white font-medium shadow-lg
                     hover:scale-105 active:scale-95 transform transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-label="Open symbol search"
        >
          <FaSearch className="w-4 h-4" />
          <span className="text-sm sm:text-base font-semibold">
            Search symbols (Crypto & Forex)
          </span>
        </button>
      </div>

      {/* Right: empty space for layout balance */}
      <div className="w-6" />
    </header>
  );
}
