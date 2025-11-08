// frontend/src/components/ChartToolbar.jsx

import React, { useState } from "react";
import {
  FaChartLine,
  FaMinus,
  FaSquare,
  FaPencilAlt,
  FaEraser,
  FaRulerHorizontal,
  FaChartBar,
} from "react-icons/fa";
import { TbMathFunction } from "react-icons/tb";

export default function ChartToolbar({ onShowIndicators }) {
  const [activeTool, setActiveTool] = useState(null);

  const tools = [
    { id: "trendline", icon: FaChartLine, label: "Trend Line", color: "blue" },
    { id: "hline", icon: FaMinus, label: "Horizontal Line", color: "green" },
    { id: "rectangle", icon: FaSquare, label: "Rectangle", color: "purple" },
    { id: "fibonacci", icon: TbMathFunction, label: "Fibonacci", color: "yellow" },
    { id: "brush", icon: FaPencilAlt, label: "Brush", color: "pink" },
    { id: "eraser", icon: FaEraser, label: "Clear All", color: "red" },
  ];

  const selectTool = (toolId) => {
    console.log("🔧 Toolbar: Tool clicked:", toolId);
    
    if (toolId === "eraser") {
      setActiveTool(null);
    } else {
      setActiveTool(toolId);
    }

    // ارسال event به ChartContainer
    const detail = { tool: toolId === "eraser" ? "eraser" : toolId };
    const eventNames = [
      "tvmini:tool:selected",
      "tvmini:toolSelected", 
      "tvmini:tool"
    ];
    
    eventNames.forEach((ename) => {
      try {
        window.dispatchEvent(new CustomEvent(ename, { detail }));
      } catch (err) {
        const ev = document.createEvent("CustomEvent");
        ev.initCustomEvent(ename, false, false, detail);
        window.dispatchEvent(ev);
      }
    });
    
    console.log("✅ Toolbar: Events dispatched for tool:", toolId);
  };

  const handleIndicators = () => {
    console.log("📊 Opening indicators modal");
    if (typeof onShowIndicators === "function") {
      onShowIndicators();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-[#151921] border-b border-gray-700">
      {/* Drawing Tools */}
      <div className="flex items-center gap-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          const colorClasses = {
            blue: "hover:bg-blue-500/20 hover:text-blue-400",
            green: "hover:bg-green-500/20 hover:text-green-400",
            purple: "hover:bg-purple-500/20 hover:text-purple-400",
            yellow: "hover:bg-yellow-500/20 hover:text-yellow-400",
            pink: "hover:bg-pink-500/20 hover:text-pink-400",
            red: "hover:bg-red-500/20 hover:text-red-400",
          };
          const activeClasses = {
            blue: "bg-blue-500/30 text-blue-400",
            green: "bg-green-500/30 text-green-400",
            purple: "bg-purple-500/30 text-purple-400",
            yellow: "bg-yellow-500/30 text-yellow-400",
            pink: "bg-pink-500/30 text-pink-400",
            red: "bg-red-500/30 text-red-400",
          };

          return (
            <button
              key={tool.id}
              onClick={() => selectTool(tool.id)}
              className={`p-2 rounded transition-all ${
                isActive ? activeClasses[tool.color] : `text-gray-400 ${colorClasses[tool.color]}`
              }`}
              title={tool.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-700" />

      {/* Indicators Button */}
      {/* <button
        onClick={handleIndicators}
        className="flex items-center gap-2 px-3 py-2 rounded text-gray-300 hover:bg-indigo-500/20 hover:text-indigo-400 transition-all"
        title="Add Indicators"
      >
        <FaChartBar size={18} />
        <span className="text-sm font-medium">Indicators</span>
      </button> */}

      {/* Active Tool Info */}
      {activeTool && (
        <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded text-xs text-gray-400">
          <span>Active:</span>
          <span className="text-blue-400 font-medium">
            {tools.find((t) => t.id === activeTool)?.label}
          </span>
        </div>
      )}
    </div>
  );
}