import React from "react";

const OPTIONS = [
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "30m", label: "30m" },
  { id: "1h", label: "1h" },
  { id: "4h", label: "4h" },
  { id: "1d", label: "1d" },
  { id: "1w", label: "1w" },
  { id: "1M", label: "1M" },
];

export default function IntervalSelector({ value, onChange }) {
  return (
    <div role="group" aria-label="Chart interval" className="grid w-full grid-cols-5 gap-1 sm:flex sm:flex-wrap sm:items-center">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          aria-pressed={value === opt.id}
          className={`min-h-10 min-w-0 rounded border px-2 py-1 text-xs ${
            value === opt.id ? "border-sky-300 bg-[#18313d] font-semibold text-white" : "border-gray-700 bg-transparent text-gray-200 hover:bg-gray-800"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
