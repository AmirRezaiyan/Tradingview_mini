import React, { useEffect, useState } from "react";
import {
  FaRuler,
  FaArrowsAltH,
  FaDraftingCompass,
  FaSquare,
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

  useEffect(() => {
    const syncActiveTool = (event) => setActive(event.detail?.tool ?? null);
    const eventNames = ["tvmini:tool:selected", "tvmini:toolSelected", "tvmini:tool"];
    eventNames.forEach((eventName) => window.addEventListener(eventName, syncActiveTool));
    return () => eventNames.forEach((eventName) => window.removeEventListener(eventName, syncActiveTool));
  }, []);

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
    <div role="group" aria-label="Drawing tools" className="flex min-w-0 flex-wrap items-center gap-1">
      {active && <span className="mr-1 text-xs text-gray-300">Active: {TOOL_LIST.find((tool) => tool.id === active)?.name}</span>}
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-700 bg-[#101820] p-1">
        {TOOL_LIST.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleClick(t.id)}
            title={t.name}
            aria-label={t.name}
            className={`flex h-10 w-10 items-center justify-center rounded-md text-gray-100
          ${active === t.id ? "border border-sky-300 bg-[#18313d] text-white" : "border border-transparent hover:bg-gray-700"}
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
