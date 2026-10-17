
import React from "react";
import { FaBars, FaSearch } from "react-icons/fa";

export default function Header({
  onToggleSidebar,
  onOpenSearch,
  searchButtonRef,
}) {
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-800 bg-[#0b0f14] px-3 text-gray-100 sm:px-4 lg:h-16">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-700 text-gray-200 hover:bg-gray-800"
        aria-label="Toggle watchlist panel"
      >
        <FaBars aria-hidden="true" className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 justify-center">
        <button
          ref={searchButtonRef}
          type="button"
          onClick={onOpenSearch}
          className="flex min-h-11 w-full max-w-lg min-w-0 items-center justify-center gap-2 rounded-md border border-sky-700 bg-[#10202b] px-3 py-2 text-white hover:bg-[#173140]"
          aria-label="Open symbol search"
        >
          <FaSearch aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-semibold">
            Search symbols
          </span>
        </button>
      </div>

      <div aria-hidden="true" className="w-11 shrink-0" />
    </header>
  );
}
