import React, { useState } from "react";
import {
  FaRuler,
  FaArrowsAltH,
  FaDraftingCompass,
  FaSquare,
  FaEraser,
  FaMagic,
} from "react-icons/fa";

const TOOL_LIST = [
  { id: "trendline", name: "Trendline", icon: <FaRuler /> },
  { id: "hline", name: "Horizontal Line", icon: <FaArrowsAltH /> },
  { id: "fibonacci", name: "Fibonacci", icon: <FaDraftingCompass /> },
  { id: "rectangle", name: "Rectangle", icon: <FaSquare /> },
  { id: "brush", name: "Brush", icon: <FaMagic /> },
  // { id: "eraser", name: "Eraser", icon: <FaEraser /> },
];

export default function ChartToolbar({ initialTool = null, onSelectTool } = {}) {
  const [active, setActive] = useState(initialTool);

  const handleClick = (tool) => {
    const next = active === tool ? null : tool;
    setActive(next);

    const detail = { tool: next };
    // emit multiple event names for compatibility with different listeners
    const eventNames = [
      "tvmini:tool:selected",
      "tvmini:toolSelected",
      "tvmini:tool",
    ];
    eventNames.forEach((ename) => {
      try {
        window.dispatchEvent(new CustomEvent(ename, { detail }));
      } catch (err) {
        // CustomEvent should exist in modern browsers; if not, fallback:
        const ev = document.createEvent("CustomEvent");
        ev.initCustomEvent(ename, false, false, detail);
        window.dispatchEvent(ev);
      }
    });

    console.debug("tvmini:tool -> dispatched", detail, "events:", eventNames);

    if (typeof onSelectTool === "function") onSelectTool(next);
  };

  return (
    <div className="absolute top-4 left-4 z-50">
      <div className="flex gap-1 bg-[#101820cc] backdrop-blur-md rounded-lg p-1 shadow-lg border border-gray-800 max-w-[250px]">
        {TOOL_LIST.map((t) => (
          <button
            key={t.id}
            onClick={() => handleClick(t.id)}
            title={t.name}
            className={`w-8 h-8 flex items-center justify-center rounded-md text-gray-200 transition-transform duration-150
          ${active === t.id ? "scale-105 border border-[#00ff7f] bg-black/20" : "hover:text-[#00ff7f] hover:scale-105"}
        `}
            aria-pressed={active === t.id}
          >
            <span className="text-base">{t.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
