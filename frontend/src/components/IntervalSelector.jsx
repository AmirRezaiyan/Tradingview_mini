// src/components/IntervalSelector.jsx
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
    <div className="flex items-center gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-2 py-1 text-xs rounded ${
            value === opt.id ? "bg-gray-700 text-white" : "bg-transparent text-gray-400 hover:bg-gray-800"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
