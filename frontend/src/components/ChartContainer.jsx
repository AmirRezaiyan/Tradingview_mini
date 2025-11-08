import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import api from "../api/api";
import ChartToolbar from "./ChartToolbar";
// import IndicatorModal from "./IndicatorModal";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
} from "./indicators";

// اگر IndicatorModal فایل جداگانه ندارید، از این استفاده کنید:
import { FaChartLine, FaTimes, FaSearch } from "react-icons/fa";

const indicatorsList = [
  {
    id: "rsi",
    name: "RSI",
    description: "Relative Strength Index",
    type: "momentum",
    defaultParams: { period: 14 },
    tags: ["momentum", "oscillator"],
  },
  {
    id: "macd",
    name: "MACD",
    description: "Moving Average Convergence Divergence",
    type: "trend",
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    tags: ["trend", "histogram"],
  },
  {
    id: "ema",
    name: "EMA",
    description: "Exponential Moving Average",
    type: "trend",
    defaultParams: { period: 20 },
    tags: ["moving average", "trend"],
  },
  {
    id: "sma",
    name: "SMA",
    description: "Simple Moving Average",
    type: "trend",
    defaultParams: { period: 20 },
    tags: ["moving average", "trend"],
  },
];

// کامپوننت IndicatorModal به صورت inline
function IndicatorModal({ isOpen, onClose }) {
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState(indicatorsList);

  useEffect(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) {
      setFiltered(indicatorsList);
      return;
    }
    setFiltered(
      indicatorsList.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.tags && i.tags.join(" ").toLowerCase().includes(q)) ||
          (i.id && i.id.toLowerCase().includes(q))
      )
    );
  }, [search]);


  useEffect(() => {
    return () => {
      // unsubscribe timeScale visible-range listener if present
      try {
        const unsub = indicatorsUnsubscribeRef.current;
        if (typeof unsub === 'function') {
          try { unsub(); } catch (e) { /* ignore */ }
        } else if (unsub && typeof unsub.unsubscribe === 'function') {
          try { unsub.unsubscribe(); } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }

      // remove global resize handler registered by ensureIndicatorsSync
      try {
        if (indicatorsPanelsRef.current && indicatorsPanelsRef.current.__resizeRegistered && indicatorsPanelsRef.current.__resizeHandler) {
          window.removeEventListener('resize', indicatorsPanelsRef.current.__resizeHandler);
        }
      } catch (e) { /* ignore */ }

      // disconnect per-panel ResizeObservers and optionally remove panel charts
      try {
        Object.values(indicatorsPanelsRef.current || {}).forEach((p) => {
          if (!p) return;
          try {
            if (p.container && p.container._resizeObserver && typeof p.container._resizeObserver.disconnect === 'function') {
              p.container._resizeObserver.disconnect();
              delete p.container._resizeObserver;
            }
          } catch (e) { /* ignore */ }
          // Do NOT forcibly remove charts if they may be reused; uncomment if you want full teardown:
          // try { if (p.chart && typeof p.chart.remove === 'function') p.chart.remove(); } catch(e){ }
        });
      } catch (e) { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  const choose = (ind) => {
    console.log("✅ Indicator selected from modal:", ind);
    const detail = { indicator: ind };
    window.dispatchEvent(new CustomEvent('tvmini:add:indicator', { detail }));
    if (typeof onClose === "function") onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && typeof onClose === "function") {
          onClose();
        }
      }}
    >
      <div className="bg-[#101820] rounded-xl shadow-2xl w-full max-w-lg border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-[#101820] z-10">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <FaChartLine className="text-blue-400" /> Indicators
          </h2>
          <button
            onClick={() => { if (typeof onClose === "function") onClose(); }}
            className="text-gray-400 hover:text-red-400 p-2 rounded-full transition-colors"
            title="بستن"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <FaSearch className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Indicators(RSI, MACD, EMA, ...)"
              className="pl-10 pr-3 py-2.5 w-full rounded-lg bg-[#0b0f14] text-gray-200 placeholder-gray-500 border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh] border-t border-gray-800">
          {filtered.length > 0 ? (
            filtered.map((ind) => (
              <button
                key={ind.id || ind.name}
                onClick={() => choose(ind)}
                className="w-full text-left px-4 py-3 hover:bg-[#1a2332] transition-colors flex flex-col justify-start border-b border-gray-800 last:border-b-0"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="text-sm font-medium text-gray-100">{ind.name}</div>
                  <div className="text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">{ind.type}</div>
                </div>
                <div className="text-xs text-gray-400 mt-1">{ind.description}</div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">اندیکاتور منطبق پیدا نشد.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Configuration constants
// -----------------------------------------------------------------------------
const DRAW_COLOR = "#1e90ff";
const DRAW_WIDTH = 2;
const RIGHT_GUTTER = 70;
const STORAGE_PREFIX = "tvmini:drawings:v1";

// -----------------------------------------------------------------------------
// Utility functions
// -----------------------------------------------------------------------------

const resizeIndicatorPanel = (container, chart) => {
  if (!container || !chart) return;
  try {
    const width = container.clientWidth || container.offsetWidth || 600;
    const height = container.clientHeight || container.offsetHeight || 150;
    chart.resize(width, height);

    setTimeout(() => {
      try {
        chart.resize(width, height);
      } catch (e) { }
    }, 50);
  } catch (e) { }
};

const registerResizeObserverForPanel = (panelId, container, chart) => {
  if (!container || !chart) return;

  try {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        resizeIndicatorPanel(container, chart);
      }
    });

    observer.observe(container);
    container._resizeObserver = observer;
  } catch (e) { }
};


function parseTimeToSec(t) {
  if (t == null) return NaN;
  const n = Number(t);
  if (!Number.isNaN(n)) {
    if (n > 1e12) return Math.floor(n / 1000);
    return Math.floor(n);
  }
  const parsed = Date.parse(String(t));
  if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000);
  return NaN;
}

function normalizeAndSortCandles(raw) {
  const mapped = [];
  const invalid = [];
  for (let i = 0; i < raw.length; i++) {
    const d = raw[i];
    const timeSec = parseTimeToSec(d.time);
    const open = Number(d.open);
    const high = Number(d.high);
    const low = Number(d.low);
    const close = Number(d.close);

    const ok =
      Number.isFinite(timeSec) &&
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close);

    if (!ok) {
      invalid.push({ index: i, raw: d });
      continue;
    }

    mapped.push({
      time: Math.floor(timeSec),
      open,
      high,
      low,
      close,
    });
  }

  if (invalid.length) {
    console.warn(
      "normalizeAndSortCandles: filtered invalid candle rows (show up to 8):",
      invalid.slice(0, 8)
    );
  }

  mapped.sort((a, b) => a.time - b.time);

  const unique = [];
  let lastTime = null;
  for (const c of mapped) {
    if (c.time === lastTime) {
      unique[unique.length - 1] = c;
    } else {
      unique.push(c);
      lastTime = c.time;
    }
  }

  return unique;
}

function intervalToSeconds(interval) {
  if (!interval) return 3600;
  const m = interval.match(/^(\d+)(m|h|d|w|M)$/);
  if (!m) return 3600;
  const val = Number(m[1]);
  const unit = m[2];
  switch (unit) {
    case "m":
      return val * 60;
    case "h":
      return val * 3600;
    case "d":
      return val * 86400;
    case "w":
      return val * 7 * 86400;
    case "M":
      return val * 30 * 86400;
    default:
      return 3600;
  }
}

function formatRemaining(sec) {
  if (sec <= 0) return "0s";
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }
  if (sec < 86400) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const d = Math.floor(sec / 86400);
  return `${d}d`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------
export default function ChartContainer({
  marketType = "crypto",
  symbol = "BTCUSDT",
  interval = "1h",
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const svgRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [lastCandle, setLastCandle] = useState(null);
  const [remainingSec, setRemainingSec] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fade, setFade] = useState(false);

  const [activeTool, setActiveTool] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [currentDrawing, setCurrentDrawing] = useState(null);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [candlesData, setCandlesData] = useState([]);
  const isDrawingRef = useRef(false);
  const indicatorSeriesRef = useRef({});
  const [showManageDrawings, setShowManageDrawings] = useState(false);
  const [showManageIndicators, setShowManageIndicators] = useState(false);

  const interactionDisabledRef = useRef(false);

  const indicatorsPanelsRef = useRef({});          // store { id: { chart, container } }
  const indicatorsSyncRef = useRef(false);         // ensureIndicatorsSync run-once guard
  const indicatorsUnsubscribeRef = useRef(null);

  const isRestoringRef = useRef(false);

  const [selectedId, setSelectedId] = useState(null);
  const editingRef = useRef({ mode: null, id: null, startMouseX: 0, startMouseY: 0, orig: null });

  const storageKey = () => `${STORAGE_PREFIX}:${marketType}:${String(symbol).toUpperCase()}:${interval}`;

  const getChartInnerSize = () => {
    try {
      if (!containerRef.current) return { width: 800, height: 400, left: 0, top: 0 };
      const containerRect = containerRef.current.getBoundingClientRect();
      const canvas = containerRef.current.querySelector('canvas');
      if (canvas && canvas.getBoundingClientRect) {
        const r = canvas.getBoundingClientRect();
        const left = Math.max(0, Math.floor(r.left - containerRect.left));
        const top = Math.max(0, Math.floor(r.top - containerRect.top));
        return { width: Math.max(0, Math.floor(r.width)), height: Math.max(0, Math.floor(r.height)), left, top };
      }
      return { width: Math.max(0, containerRef.current.clientWidth - RIGHT_GUTTER), height: containerRef.current.clientHeight, left: 0, top: 0 };
    } catch (e) {
      return { width: 800, height: 400, left: 0, top: 0 };
    }
  };

  const getCanvasRect = () => {
    if (!containerRef.current) return null;
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas || !canvas.getBoundingClientRect) return null;
    return canvas.getBoundingClientRect();
  };

  const persistDrawings = (list) => {
    try {
      if (isRestoringRef.current) return;
      const payload = (list || drawings).map((d) => {
        const out = {
          id: d.id,
          type: d.type,
          startTime: d.startTime ?? null,
          startPrice: d.startPrice ?? null,
          endTime: d.endTime ?? null,
          endPrice: d.endPrice ?? null,
          createdAt: d.createdAt ?? null,
        };
        if (Number.isFinite(d.startX)) out.startX = d.startX;
        if (Number.isFinite(d.startY)) out.startY = d.startY;
        if (Number.isFinite(d.endX)) out.endX = d.endX;
        if (Number.isFinite(d.endY)) out.endY = d.endY;
        return out;
      });
      const wrapper = { version: 1, marketType, symbol: String(symbol).toUpperCase(), interval, drawings: payload, savedAt: Date.now() };
      localStorage.setItem(storageKey(), JSON.stringify(wrapper));
    } catch (e) {
      console.warn("Failed to persist drawings:", e);
    }
  };

  const projectDrawingsToPixels = (loaded) => {
    if (!chartRef.current || !candleSeriesRef.current) {
      return loaded.map((d) => ({ ...d, startX: d.startX ?? null, startY: d.startY ?? null, endX: d.endX ?? null, endY: d.endY ?? null }));
    }
    try {
      const timeScale = chartRef.current.timeScale();
      const s = candleSeriesRef.current;
      const inner = getChartInnerSize();
      const left = inner.left;
      const width = inner.width;

      return loaded.map((d) => {
        const hasPixel = Number.isFinite(d.startX) && Number.isFinite(d.startY) && Number.isFinite(d.endX) && Number.isFinite(d.endY);
        if (hasPixel) {
          return { ...d };
        }
        const x1 = typeof timeScale.timeToCoordinate === 'function' && d.startTime != null ? timeScale.timeToCoordinate(d.startTime) : null;
        const y1 = s && typeof s.priceToCoordinate === 'function' && d.startPrice != null ? s.priceToCoordinate(d.startPrice) : null;
        const x2 = typeof timeScale.timeToCoordinate === 'function' && d.endTime != null ? timeScale.timeToCoordinate(d.endTime) : null;
        const y2 = s && typeof s.priceToCoordinate === 'function' && d.endPrice != null ? s.priceToCoordinate(d.endPrice) : null;

        if (d.type === "hline") {
          const y = (y1 != null) ? y1 : (Number.isFinite(d.startY) ? d.startY : null);
          if (y == null) return { ...d, startX: null, startY: null, endX: null, endY: null };
          return { ...d, startX: left, startY: y, endX: left + Math.max(0, width), endY: y };
        }

        if (x1 != null && y1 != null && x2 != null && y2 != null) {
          return { ...d, startX: x1, startY: y1, endX: x2, endY: y2 };
        }

        return { ...d, startX: (Number.isFinite(d.startX) ? d.startX : null), startY: (Number.isFinite(d.startY) ? d.startY : null), endX: (Number.isFinite(d.endX) ? d.endX : null), endY: (Number.isFinite(d.endY) ? d.endY : null) };
      });
    } catch (err) {
      console.warn("projectDrawingsToPixels failed:", err);
      return loaded.map((d) => ({ ...d, startX: d.startX ?? null, startY: d.startY ?? null, endX: d.endX ?? null, endY: d.endY ?? null }));
    }
  };

  const restoreDrawings = () => {
    try {
      const raw = localStorage.getItem(storageKey());
      if (!raw) {
        setDrawings([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.drawings)) {
        setDrawings([]);
        return;
      }

      isRestoringRef.current = true;

      const loaded = parsed.drawings.map((d) => ({
        ...d,
        startX: Number.isFinite(d.startX) ? d.startX : (d.startX === 0 ? 0 : null),
        startY: Number.isFinite(d.startY) ? d.startY : (d.startY === 0 ? 0 : null),
        endX: Number.isFinite(d.endX) ? d.endX : (d.endX === 0 ? 0 : null),
        endY: Number.isFinite(d.endY) ? d.endY : (d.endY === 0 ? 0 : null),
      }));

      setDrawings(loaded);

      setTimeout(() => {
        isRestoringRef.current = false;
      }, 500);
    } catch (e) {
      console.warn("Failed to restore drawings:", e);
      setDrawings([]);
      isRestoringRef.current = false;
    }
  };

  // -----------------------------------------------------------------------
  // Chart initialization
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 800,
      height: containerRef.current.clientHeight || 400,
      layout: { background: { color: "#0b0f14" }, textColor: "#d1d5db" },
      rightPriceScale: { borderColor: "#262b33" },
      timeScale: { borderColor: "#262b33", timeVisible: true },
      grid: { vertLines: { color: "#1e232a" }, horzLines: { color: "#1e232a" } },
      crosshair: {
        mode: 0,
        vertLine: { width: 1, color: "#888", style: 2, labelBackgroundColor: "#333" },
        horzLine: { color: "#888", style: 2, labelBackgroundColor: "#333" },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#00ff7f",
      downColor: "#ff4c4c",
      borderUpColor: "#00ff7f",
      borderDownColor: "#ff4c4c",
      wickUpColor: "#00ff7f",
      wickDownColor: "#ff4c4c",
    });

    chartRef.current = chart;
    candleSeriesRef.current = series;

    restoreDrawings();

    const resizeHandler = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", resizeHandler);
    try {
      const ro = new ResizeObserver(() => {
        try {
          if (containerRef.current && chartRef.current) {
            const w = containerRef.current.clientWidth || 800;
            const h = containerRef.current.clientHeight || 400;
            // prefer applyOptions, fallback to resize
            try { chartRef.current.applyOptions({ width: w, height: h }); } catch (e) { try { chartRef.current.resize(w, h); } catch (_) { } }
          }
        } catch (e) { /* swallow */ }
      });
      ro.observe(containerRef.current);
      resizeObserverRef.current = ro;
    } catch (e) { /* ignore if ResizeObserver not available */ }

    return () => {
      window.removeEventListener("resize", resizeHandler);
      try { if (resizeObserverRef.current) { resizeObserverRef.current.disconnect(); resizeObserverRef.current = null; } } catch(e) {}
      try {
        chart.remove();
      } catch (e) { }
      chartRef.current = null;
      candleSeriesRef.current = null;
      setLastCandle(null);
    };
  }, []);

  useEffect(() => {
    restoreDrawings();
  }, [symbol, interval, marketType]);

  // -----------------------------------------------------------------------
  // Toolbar event handling
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handleToolSelect = (e) => {
      const tool = e.detail?.tool ?? null;
      console.log("🔧 Tool selected:", tool);
      if (tool === "eraser") {
        setShowManageDrawings(true);
        setActiveTool(null);
        return;
      }
      setActiveTool(tool);
      if (!tool) {
        isDrawingRef.current = false;
        setCurrentDrawing(null);
      }
    };

    window.addEventListener("tvmini:tool:selected", handleToolSelect);
    window.addEventListener("tvmini:toolSelected", handleToolSelect);
    window.addEventListener("tvmini:tool", handleToolSelect);

    return () => {
      window.removeEventListener("tvmini:tool:selected", handleToolSelect);
      window.removeEventListener("tvmini:toolSelected", handleToolSelect);
      window.removeEventListener("tvmini:tool", handleToolSelect);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Indicator add handling
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handleAddIndicator = (e) => {
      const indicator = e.detail?.indicator;
      if (!indicator) return;
      console.log("📊 Indicator selected:", indicator);
      const exists = activeIndicators.find((ind) => ind.id === indicator.id);
      if (exists) {
        console.log("⚠️ Indicator already exists");
        return;
      }
      setActiveIndicators((prev) => [...prev, indicator]);
    };

    window.addEventListener("tvmini:add:indicator", handleAddIndicator);
    window.addEventListener("tvmini:indicator:add", handleAddIndicator);
    window.addEventListener("tvmini:indicator:selected", handleAddIndicator);
    window.addEventListener("tvmini:indicator", handleAddIndicator);

    return () => {
      window.removeEventListener("tvmini:add:indicator", handleAddIndicator);
      window.removeEventListener("tvmini:indicator:add", handleAddIndicator);
      window.removeEventListener("tvmini:indicator:selected", handleAddIndicator);
      window.removeEventListener("tvmini:indicator", handleAddIndicator);
    };
  }, [activeIndicators]);

  // -----------------------------------------------------------------------
  // Indicator calculation & display (با پشتیبانی کامل RSI و MACD در پنل جداگانه)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!chartRef.current || !candlesData.length || !activeIndicators.length) return;

    console.log("📈 Calculating indicators for", candlesData.length, "candles");

    // حذف اندیکاتورهای قبلی
    Object.keys(indicatorSeriesRef.current).forEach((key) => {
      const item = indicatorSeriesRef.current[key];
      try {
        if (item && typeof item.remove === 'function') {
          item.remove();
        } else if (item && item.series) {
          chartRef.current.removeSeries(item.series);
        } else if (item) {
          chartRef.current.removeSeries(item);
        }
      } catch (e) {
        console.warn("Error removing series:", e);
      }
    });
    indicatorSeriesRef.current = {};

    activeIndicators.forEach((indicator) => {
      try {
        let data = [];
        let series = null;

        switch (indicator.id) {
          case "sma": {
            const period = indicator.defaultParams?.period || 20;
            data = calculateSMA(candlesData, period);
            series = chartRef.current.addLineSeries({
              color: "#2962FF",
              lineWidth: 2,
              title: `SMA(${period})`,
              lastValueVisible: true,
              priceLineVisible: false,
            });
            series.setData(data);
            indicatorSeriesRef.current[`sma_${period}`] = series;
            console.log(`✅ SMA(${period}) added to main chart`);
            break;
          }

          case "ema": {
            const period = indicator.defaultParams?.period || 20;
            data = calculateEMA(candlesData, period);
            series = chartRef.current.addLineSeries({
              color: "#FF6D00",
              lineWidth: 2,
              title: `EMA(${period})`,
              lastValueVisible: true,
              priceLineVisible: false,
            });
            series.setData(data);
            indicatorSeriesRef.current[`ema_${period}`] = series;
            console.log(`✅ EMA(${period}) added to main chart`);
            break;
          }

          case "rsi": {
            const period = indicator.defaultParams?.period || 14;
            data = calculateRSI(candlesData, period);
            console.log(`✅ RSI(${period}) calculated:`, Array.isArray(data) ? data.length : 'non-array');

            // helper: climb DOM to find the panels container (flex-1 flex-col)
            const findPanelsParent = (start) => {
              let node = start;
              while (node) {
                try {
                  const cls = node.className || '';
                  if (typeof cls === 'string' && cls.includes && cls.includes('flex-1') && cls.includes('flex-col')) {
                    return node;
                  }
                } catch (e) { }
                node = node.parentElement;
              }
              return null;
            };

            let rsiContainer = document.getElementById('rsi-chart-container');
            if (!rsiContainer) {
              rsiContainer = document.createElement('div');
              rsiContainer.id = 'rsi-chart-container';
              // اعمال مستقیم استایل‌ها
              Object.assign(rsiContainer.style, {
                width: '100%',
                height: '180px',
                marginTop: '8px',
                border: '1px solid #262b33',
                borderRadius: '8px',
                backgroundColor: '#0b0f14',
                position: 'relative',
                overflow: 'hidden',
                flex: '0 0 auto'
              });
              rsiContainer.classList.add('indicator-panel');
            }

            // decide parent
            let panelsParent = null;
            try {
              panelsParent = findPanelsParent(containerRef.current) || containerRef.current.parentElement;
            } catch (e) {
              panelsParent = containerRef.current?.parentElement;
            }

            if (panelsParent) {
              const firstIndicator = panelsParent.querySelector && panelsParent.querySelector('.indicator-panel');
              if (!rsiContainer.parentElement) {
                if (firstIndicator) panelsParent.insertBefore(rsiContainer, firstIndicator);
                else panelsParent.appendChild(rsiContainer);
              }
              if (!rsiContainer.classList.contains('indicator-panel')) rsiContainer.classList.add('indicator-panel');
            } else {
              if (!rsiContainer.parentElement && containerRef.current && containerRef.current.parentElement) {
                containerRef.current.parentElement.appendChild(rsiContainer);
                if (!rsiContainer.classList.contains('indicator-panel')) rsiContainer.classList.add('indicator-panel');
              }
            }

            // create chart
            const rsiChart = createChart(rsiContainer, {
              width: rsiContainer.clientWidth || 600,
              height: 150,
              layout: { background: { color: "#0b0f14" }, textColor: "#d1d5db" },
              rightPriceScale: { borderColor: "#262b33", scaleMargins: { top: 0.1, bottom: 0.1 } },
              timeScale: { borderColor: "#262b33", timeVisible: true, visible: false },
              grid: { vertLines: { color: "#1e232a" }, horzLines: { color: "#1e232a" } },
              crosshair: { mode: 0, vertLine: { width: 1, color: "#888", style: 2 }, horzLine: { color: "#888", style: 2 } },
            });

            const rsiSeries = rsiChart.addLineSeries({
              color: "#9C27B0",
              lineWidth: 2,
              title: `RSI(${period})`,
              lastValueVisible: false, // we show legend instead
              priceLineVisible: false,
            });

            const rsiSafeData = Array.isArray(data) ? data : (data && Array.isArray(data.values) ? data.values : Object.values(data || {}));
            try { rsiSeries.setData(Array.isArray(rsiSafeData) ? rsiSafeData : []); } catch (e) { console.warn('rsiSeries.setData failed', e); }

            // overbought/oversold lines (70/30)
            const overboughtLine = rsiChart.addLineSeries({ color: "rgba(255,82,82,0.45)", lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });
            const oversoldLine = rsiChart.addLineSeries({ color: "rgba(76,175,80,0.25)", lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false });

            try {
              const obData = (Array.isArray(rsiSafeData) ? rsiSafeData : []).map(d => ({ time: d.time, value: 70 }));
              const osData = (Array.isArray(rsiSafeData) ? rsiSafeData : []).map(d => ({ time: d.time, value: 30 }));
              overboughtLine.setData(obData.length ? obData : []);
              oversoldLine.setData(osData.length ? osData : []);
            } catch (e) { console.warn('rsi threshold setData failed', e); }

            // legend (top-center) with current RSI value
            try {
              let legend = rsiContainer.querySelector('.indicator-legend');
              const lastPoint = (Array.isArray(rsiSafeData) && rsiSafeData.length) ? rsiSafeData[rsiSafeData.length - 1] : null;
              const lastVal = lastPoint ? (lastPoint.value ?? lastPoint.v ?? lastPoint.y ?? lastPoint.close ?? null) : null;
              if (!legend) {
                legend = document.createElement('div');
                legend.className = 'indicator-legend';
                legend.style.position = 'absolute';
                legend.style.top = '6px';
                legend.style.left = '50%';
                legend.style.transform = 'translateX(-50%)';
                legend.style.padding = '4px 8px';
                legend.style.fontSize = '12px';
                legend.style.color = '#d1d5db';
                legend.style.background = 'rgba(3,7,11,0.5)';
                legend.style.border = '1px solid rgba(255,255,255,0.03)';
                legend.style.borderRadius = '6px';
                legend.style.pointerEvents = 'none';
                legend.style.zIndex = 99;
                rsiContainer.appendChild(legend);
              }
              legend.innerHTML = `RSI(${period}) <span style="color:#9C27B0; margin-left:8px">${(lastVal != null && !isNaN(lastVal)) ? Number(lastVal).toFixed(2) : '–'}</span>`;
            } catch (e) { /* ignore legend failures */ }

            // register panel (fallback)
            try {
              const panelsRefObj = (typeof indicatorsPanelsRef !== 'undefined') ? indicatorsPanelsRef : (window.__indicatorsPanelsRef_fallback = window.__indicatorsPanelsRef_fallback || { current: {} });
              if (panelsRefObj && panelsRefObj.current) {
                panelsRefObj.current['rsi'] = { chart: rsiChart, container: rsiContainer };
              } else {
                window.__indicatorsPanelsRef_fallback.current['rsi'] = { chart: rsiChart, container: rsiContainer };
              }

              // اول ensureIndicatorsSync را فراخوانی کن تا listener ثبت شود
              try { ensureIndicatorsSync(); } catch (e) { }

              // سپس ResizeObserver را ثبت کن
              try { registerResizeObserverForPanel('rsi', rsiContainer, rsiChart); } catch (e) { }

              // همگام‌سازی اولیه فوری
              try { syncIndicatorInitial(rsiChart, rsiContainer); } catch (e) { }

              // چند مرحله resize و sync برای اطمینان
              setTimeout(() => {
                try {
                  rsiChart.resize(rsiContainer.clientWidth, rsiContainer.clientHeight);
                  syncIndicatorInitial(rsiChart, rsiContainer);
                } catch (e) { }
              }, 50);

              setTimeout(() => {
                try {
                  rsiChart.resize(rsiContainer.clientWidth, rsiContainer.clientHeight);
                  syncIndicatorInitial(rsiChart, rsiContainer);
                } catch (e) { }
              }, 150);

              setTimeout(() => {
                try {
                  rsiChart.resize(rsiContainer.clientWidth, rsiContainer.clientHeight);
                  syncIndicatorInitial(rsiChart, rsiContainer);
                } catch (e) { }
              }, 300);
            } catch (e) { console.warn('register rsi panel failed', e); }

            console.log(`✅ RSI(${period}) chart created below main chart`);
            break;
          }


          case "macd": {
            const { fast = 12, slow = 26, signal = 9 } = indicator.defaultParams || {};
            data = calculateMACD(candlesData, fast, slow, signal);
            console.log(`✅ MACD(${fast},${slow},${signal}) calculated:`, Array.isArray(data) ? data.length : 'non-array');

            // helper to find panels parent
            const findPanelsParent = (start) => {
              let node = start;
              while (node) {
                try {
                  const cls = node.className || '';
                  if (typeof cls === 'string' && cls.includes && cls.includes('flex-1') && cls.includes('flex-col')) {
                    return node;
                  }
                } catch (e) { }
                node = node.parentElement;
              }
              return null;
            };

            // create container
            let macdContainer = document.getElementById('macd-chart-container');
            if (!macdContainer) {
              macdContainer = document.createElement('div');
              macdContainer.id = 'macd-chart-container';
              // اعمال مستقیم استایل‌ها
              Object.assign(macdContainer.style, {
                width: '100%',
                height: '180px', // کمی بلندتر برای MACD
                marginTop: '8px',
                border: '1px solid #262b33',
                borderRadius: '8px',
                backgroundColor: '#0b0f14',
                position: 'relative',
                overflow: 'hidden',
                flex: '0 0 auto'
              });
              macdContainer.classList.add('indicator-panel');
            }

            // attach
            let panelsParent = null;
            try {
              panelsParent = findPanelsParent(containerRef.current) || containerRef.current.parentElement;
            } catch (e) {
              panelsParent = containerRef.current?.parentElement;
            }

            if (panelsParent) {
              const firstIndicator = panelsParent.querySelector && panelsParent.querySelector('.indicator-panel');
              if (!macdContainer.parentElement) {
                if (firstIndicator) panelsParent.insertBefore(macdContainer, firstIndicator);
                else panelsParent.appendChild(macdContainer);
              }
              if (!macdContainer.classList.contains('indicator-panel')) macdContainer.classList.add('indicator-panel');
            } else {
              if (!macdContainer.parentElement && containerRef.current && containerRef.current.parentElement) {
                containerRef.current.parentElement.appendChild(macdContainer);
                if (!macdContainer.classList.contains('indicator-panel')) macdContainer.classList.add('indicator-panel');
              }
            }

            // create chart
            const macdChart = createChart(macdContainer, {
              width: macdContainer.clientWidth || 800,
              height: macdContainer.clientHeight || 180,
              layout: { background: { color: "#0b0f14" }, textColor: "#d1d5db" },
              rightPriceScale: { borderColor: "#262b33", scaleMargins: { top: 0.1, bottom: 0.1 } },
              timeScale: { borderColor: "#262b33", timeVisible: true, visible: false },
              grid: { vertLines: { color: "#1e232a" }, horzLines: { color: "#1e232a" } },
              crosshair: { mode: 0, vertLine: { width: 1, color: "#888", style: 2 }, horzLine: { color: "#888", style: 2 } },
            });

            // histogram + lines
            const histSeries = macdChart.addHistogramSeries({
              color: '#26a69a', // default, we'll use per-bar color
              priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
              lastValueVisible: true,
              priceLineVisible: false,
              scaleMargins: { top: 0.2, bottom: 0.2 },
            });
            const macdLine = macdChart.addLineSeries({ color: "#2b7cd3", lineWidth: 2, title: "MACD", lastValueVisible: true, priceLineVisible: false });
            const signalLine = macdChart.addLineSeries({ color: "#ff9800", lineWidth: 2, title: "Signal", lastValueVisible: true, priceLineVisible: false });

            // normalize calculateMACD output
            const macdArr = [];
            const signalArr = [];
            const histArr = [];
            const timesForLegend = [];

            if (Array.isArray(data)) {
              data.forEach(d => {
                if (!d) return;
                const t = d.time ?? d.t ?? d.timestamp;
                // typical structure: {time, macd, signal, hist}
                if (d.macd !== undefined && d.macd !== null) macdArr.push({ time: t, value: d.macd });
                if (d.signal !== undefined && d.signal !== null) signalArr.push({ time: t, value: d.signal });
                if (d.hist !== undefined && d.hist !== null) histArr.push({ time: t, value: d.hist, color: d.hist >= 0 ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)' });
                if (t) timesForLegend.push(t);
              });
            } else if (data && typeof data === 'object') {
              if (Array.isArray(data.macd) || Array.isArray(data.signal) || Array.isArray(data.hist)) {
                const len = Math.max(data.macd?.length || 0, data.signal?.length || 0, data.hist?.length || 0);
                for (let i = 0; i < len; i++) {
                  const m = data.macd && data.macd[i];
                  const s = data.signal && data.signal[i];
                  const h = data.hist && data.hist[i];
                  const t = (m && (m.time || m.timestamp)) || (s && (s.time || s.timestamp)) || (h && (h.time || h.timestamp)) || null;
                  if (m != null) {
                    const mv = (typeof m === 'object') ? (m.value ?? m.macd ?? m) : m;
                    if (t) macdArr.push({ time: t, value: mv });
                  }
                  if (s != null) {
                    const sv = (typeof s === 'object') ? (s.value ?? s.signal ?? s) : s;
                    if (t) signalArr.push({ time: t, value: sv });
                  }
                  if (h != null) {
                    const hv = (typeof h === 'object') ? (h.value ?? h.hist ?? h) : h;
                    if (t) histArr.push({ time: t, value: hv, color: hv >= 0 ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)' });
                  }
                  if (t) timesForLegend.push(t);
                }
              } else {
                Object.keys(data).forEach(k => {
                  const v = data[k];
                  if (!v || typeof v !== 'object') return;
                  const t = v.time ?? v.t ?? k;
                  if (v.macd !== undefined && v.macd !== null) macdArr.push({ time: t, value: v.macd });
                  if (v.signal !== undefined && v.signal !== null) signalArr.push({ time: t, value: v.signal });
                  if (v.hist !== undefined && v.hist !== null) histArr.push({ time: t, value: v.hist, color: v.hist >= 0 ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)' });
                  timesForLegend.push(t);
                });
              }
            }

            // apply data
            try { histSeries.setData(histArr.length ? histArr : []); } catch (e) { console.warn('histSeries.setData failed', e); }
            try { macdLine.setData(macdArr.length ? macdArr : []); } catch (e) { console.warn('macdLine.setData failed', e); }
            try { signalLine.setData(signalArr.length ? signalArr : []); } catch (e) { console.warn('signalLine.setData failed', e); }

            // legend box (top-left) showing latest MACD / Signal / Hist values
            // legend box (top-center) showing latest MACD / Signal / Hist values
            try {
              let legend = macdContainer.querySelector('.indicator-legend');
              const lastMacd = (macdArr.length ? macdArr[macdArr.length - 1].value : null);
              const lastSig = (signalArr.length ? signalArr[signalArr.length - 1].value : null);
              const lastHist = (histArr.length ? histArr[histArr.length - 1].value : null);
              if (!legend) {
                legend = document.createElement('div');
                legend.className = 'indicator-legend';
                legend.style.position = 'absolute';
                legend.style.top = '6px';
                legend.style.left = '50%';
                legend.style.transform = 'translateX(-50%)';
                legend.style.padding = '6px 10px';
                legend.style.fontSize = '12px';
                legend.style.color = '#d1d5db';
                legend.style.background = 'rgba(3,7,11,0.55)';
                legend.style.border = '1px solid rgba(255,255,255,0.03)';
                legend.style.borderRadius = '6px';
                legend.style.pointerEvents = 'none';
                legend.style.display = 'flex';
                legend.style.alignItems = 'center';
                legend.style.gap = '12px';
                legend.style.zIndex = 99;
                macdContainer.appendChild(legend);
              }
              legend.innerHTML = `
    <div style="font-weight:600">MACD ${fast} ${slow} close</div>
    <div style="color:#2b7cd3">MACD: ${(lastMacd != null && !isNaN(lastMacd)) ? Number(lastMacd).toFixed(2) : '–'}</div>
    <div style="color:#ff9800">Signal: ${(lastSig != null && !isNaN(lastSig)) ? Number(lastSig).toFixed(2) : '–'}</div>
    <div style="color:${(lastHist != null && lastHist >= 0) ? '#26a69a' : '#ef5350'}">Hist: ${(lastHist != null && !isNaN(lastHist)) ? Number(lastHist).toFixed(2) : '–'}</div>
  `;
            } catch (e) { /* ignore legend errors */ }


            // register panel (fallback)
            try {
              const panelsRefObj = (typeof indicatorsPanelsRef !== 'undefined') ? indicatorsPanelsRef : (window.__indicatorsPanelsRef_fallback = window.__indicatorsPanelsRef_fallback || { current: {} });
              if (panelsRefObj && panelsRefObj.current) {
                panelsRefObj.current['macd'] = { chart: macdChart, container: macdContainer };
              } else {
                window.__indicatorsPanelsRef_fallback.current['macd'] = { chart: macdChart, container: macdContainer };
              }
              try { syncIndicatorInitial(macdChart); } catch (e) { }
              setTimeout(() => { try { macdChart.resize(macdContainer.clientWidth, macdContainer.clientHeight); } catch (e) { } }, 60);
            } catch (e) { console.warn('register macd panel failed', e); }

            console.log(`✅ MACD(${fast},${slow},${signal}) chart created below main chart`);
            break;
          }


          default:
            console.log("⚠️ Indicator not implemented yet:", indicator.id);
        }
      } catch (err) {
        console.error("❌ Error adding indicator:", indicator.id, err);
      }
    });
  }, [activeIndicators, candlesData]);


  // -----------------------------
  // زمان‌بندی و سینک کردن پنل‌ها
  // -----------------------------
  const getMainTimeScaleObj = () => {
    if (!chartRef?.current) return null;
    try {
      // بعضی نسخه‌ها timeScale یک متد است، بعضیا یک آبجکت
      return typeof chartRef.current.timeScale === 'function' ? chartRef.current.timeScale() : chartRef.current.timeScale;
    } catch (e) { return chartRef.current.timeScale || null; }
  };

  const applyRangeToPanel = (panelChart, range) => {
    if (!panelChart || !range) return;
    try {
      // دو API متداول را امتحان کن (visible range و logical range)
      if (typeof panelChart.timeScale === 'function') {
        const ts = panelChart.timeScale();
        if (ts && typeof ts.setVisibleRange === 'function' && range.from !== undefined) {
          ts.setVisibleRange(range);
          return;
        }
        if (ts && typeof ts.setVisibleLogicalRange === 'function') {
          ts.setVisibleLogicalRange(range);
          return;
        }
      } else if (panelChart.timeScale) {
        const ts = panelChart.timeScale;
        if (ts && typeof ts.setVisibleRange === 'function' && range.from !== undefined) {
          ts.setVisibleRange(range);
          return;
        }
        if (ts && typeof ts.setVisibleLogicalRange === 'function') {
          ts.setVisibleLogicalRange(range);
          return;
        }
      }
    } catch (e) { /* ignore */ }
  };

  const ensureIndicatorsSync = () => {
    try {
      if (!chartRef?.current) return;
      if (indicatorsSyncRef.current) return; // فقط یکبار register میشه

      const mainTs = getMainTimeScaleObj();
      if (!mainTs) { indicatorsSyncRef.current = true; return; }

      // خواندن visible range (دو نوع API ممکن)
      let visibleRange = null;
      try {
        if (typeof mainTs.getVisibleRange === 'function') {
          visibleRange = mainTs.getVisibleRange();
        } else if (typeof mainTs.getVisibleLogicalRange === 'function') {
          visibleRange = mainTs.getVisibleLogicalRange();
        }
      } catch (e) { visibleRange = null; }

      // اعمال اولیه visible range به همه پنل‌ها
      Object.values(indicatorsPanelsRef.current || {}).forEach(p => {
        if (!p) return;
        try { applyRangeToPanel(p.chart, visibleRange); } catch (e) { }
      });

      // ثبت یک handler برای تغییرات آتی visible range
      // سعی کن هر دو subscribe API را پشتیبانی کنیم
      try {
        if (typeof mainTs.subscribeVisibleTimeRangeChange === 'function') {
          indicatorsUnsubscribeRef.current = mainTs.subscribeVisibleTimeRangeChange((range) => {
            if (!range) return;
            Object.values(indicatorsPanelsRef.current || {}).forEach(p => {
              try { applyRangeToPanel(p.chart, range); } catch (e) { }
            });
          });
        } else if (typeof mainTs.subscribeVisibleLogicalRangeChange === 'function') {
          indicatorsUnsubscribeRef.current = mainTs.subscribeVisibleLogicalRangeChange((range) => {
            if (!range) return;
            Object.values(indicatorsPanelsRef.current || {}).forEach(p => {
              try { applyRangeToPanel(p.chart, range); } catch (e) { }
            });
          });
        } else {
          // fallback: اگر هیچ subscribe در اختیار نیست، هر بار که اندیکاتور ساخته شد ما visible range را دستی sync می‌کنیم (در syncIndicatorInitial)
          indicatorsUnsubscribeRef.current = null;
        }
      } catch (e) {
        indicatorsUnsubscribeRef.current = null;
      }

      // ثبت resize handler که همه پنل‌ها را resize کند (یکبار)
      if (!indicatorsPanelsRef.current.__resizeRegistered) {
        indicatorsPanelsRef.current.__resizeRegistered = true;
        indicatorsPanelsRef.current.__resizeHandler = () => {
          Object.values(indicatorsPanelsRef.current || {}).forEach(p => {
            try {
              if (p && p.chart && p.container) {
                p.chart.resize(p.container.clientWidth, p.container.clientHeight);
              }
            } catch (e) { }
          });
        };
        window.addEventListener('resize', indicatorsPanelsRef.current.__resizeHandler);
      }

      indicatorsSyncRef.current = true;
    } catch (e) {
      console.warn('ensureIndicatorsSync failed', e);
      indicatorsSyncRef.current = true;
    }
  };


  // تابع حذف اندیکاتور
  const removeIndicator = (indicatorId) => {
    console.log("🗑️ Removing indicator:", indicatorId);

    // حذف از لیست فعال
    setActiveIndicators((prev) => prev.filter(ind => ind.id !== indicatorId));

    // حذف سریال و چارت‌های مربوطه
    Object.keys(indicatorSeriesRef.current).forEach((key) => {
      if (key.startsWith(indicatorId)) {
        const item = indicatorSeriesRef.current[key];
        try {
          if (item && typeof item.remove === 'function') {
            item.remove();
          } else if (item && item.series && typeof item.series.remove === 'function') {
            item.series.remove();
          } else if (chartRef.current && item && typeof chartRef.current.removeSeries === 'function') {
            try { chartRef.current.removeSeries(item); } catch (e) { /* ignore */ }
          }
        } catch (e) {
          console.warn('Error removing indicator series', key, e);
        }
        try { delete indicatorSeriesRef.current[key]; } catch (e) {}
      }
    });

    // اگر اندیکاتور پنل مجزایی ساخته (مثل RSI/MACD) بود، چارت و کانتینرش رو پاک کن
    try {
      const panelsObj = indicatorsPanelsRef.current || (window.__indicatorsPanelsRef_fallback && window.__indicatorsPanelsRef_fallback.current) || {};
      const panel = panelsObj[indicatorId];
      if (panel) {
        try {
          if (panel.chart && typeof panel.chart.remove === 'function') {
            panel.chart.remove();
          }
        } catch (e) { /* ignore */ }

        try {
          if (panel.container) {
            // disconnect ResizeObserver if present
            if (panel.container._resizeObserver && typeof panel.container._resizeObserver.disconnect === 'function') {
              try { panel.container._resizeObserver.disconnect(); } catch (ee) { /* ignore */ }
              try { delete panel.container._resizeObserver; } catch (_) { }
            }
            // remove from DOM
            if (panel.container.parentElement) {
              try { panel.container.parentElement.removeChild(panel.container); } catch (ee) { /* ignore */ }
            } else {
              try { panel.container.remove(); } catch (ee) { /* ignore */ }
            }
          }
        } catch (e) { /* ignore */ }

        try { delete panelsObj[indicatorId]; } catch (e) {}
      }
    } catch (e) {
      console.warn('removeIndicator: panel removal failed', e);
    }

    // notify ensureIndicatorsSync to refresh listeners / sizes
    try {
      // small timeout to let React update activeIndicators first
      setTimeout(() => {
        try {
          if (chartRef.current && typeof chartRef.current.timeScale === 'function') {
            const ts = chartRef.current.timeScale();
            if (ts && typeof ts.fitContent === 'function') ts.fitContent();
          }
        } catch (e) { /* ignore */ }
        try { ensureIndicatorsSync(); } catch (e) {}
      }, 60);
    } catch (e) { /* ignore */ }
  };


  // -----------------------------
  // اجرای یکبار سینک اولیه برای هر پنل جدید
  // -----------------------------
  const syncIndicatorInitial = (panelChart, panelContainer) => {
    try {
      if (!chartRef?.current || !panelChart) return;

      const mainTs = getMainTimeScaleObj();
      if (!mainTs) return;

      // copy timeScale options (best-effort)
      try {
        const tryApply = (srcTs, destChart) => {
          try {
            // بعضی ورژن‌ها applyOptions روی timeScale دارند
            const opts = (typeof srcTs.options === 'function') ? srcTs.options() : (srcTs.options || null);
            if (opts && destChart && destChart.timeScale && typeof destChart.timeScale().applyOptions === 'function') {
              destChart.timeScale().applyOptions(opts);
            }
          } catch (e) { }
        };
        tryApply(mainTs, panelChart);
      } catch (e) { }

      // copy visible range (try both visibleRange and logicalRange)
      try {
        let vr = null;
        if (typeof mainTs.getVisibleRange === 'function') vr = mainTs.getVisibleRange();
        else if (typeof mainTs.getVisibleLogicalRange === 'function') vr = mainTs.getVisibleLogicalRange();
        if (vr) {
          applyRangeToPanel(panelChart, vr);
        }
      } catch (e) { }

      // small timeout and resize to avoid black area / offset
      setTimeout(() => {
        try {
          const cont = panelContainer || (panelChart && (panelChart._container || null));
          if (cont && panelChart && typeof panelChart.resize === 'function') {
            panelChart.resize((cont.clientWidth || cont.offsetWidth || 600), (cont.clientHeight || 150));
          }
        } catch (e) { }
        // and re-apply visible range after resize to be safe
        try {
          const mainTs2 = getMainTimeScaleObj();
          let vr2 = null;
          if (mainTs2) {
            if (typeof mainTs2.getVisibleRange === 'function') vr2 = mainTs2.getVisibleRange();
            else if (typeof mainTs2.getVisibleLogicalRange === 'function') vr2 = mainTs2.getVisibleLogicalRange();
          }
          if (vr2) applyRangeToPanel(panelChart, vr2);
        } catch (e) { }
      }, 80);
    } catch (e) {
      // swallow
    }
  };




  // -----------------------------------------------------------------------
  // Interaction toggling while drawing
  // -----------------------------------------------------------------------
  const setChartInteraction = (enabled) => {
    if (!chartRef.current) return;
    try {
      chartRef.current.applyOptions({
        handleScroll: { mouseWheel: Boolean(enabled), pressedMouseMove: Boolean(enabled), horzTouchDrag: Boolean(enabled) },
        handleScale: { axisPressedMouseMove: Boolean(enabled), mouseWheel: Boolean(enabled), pinch: Boolean(enabled) },
      });
      interactionDisabledRef.current = !enabled;
    } catch (e) {
      console.warn("applyOptions handleScroll/handleScale failed:", e);
    }
  };

  // ------------------------------
  // Editing handlers
  // ------------------------------
  const beginEdit = (e, drawing, mode) => {
    if (isDrawingRef.current) return;
    e.stopPropagation();
    e.preventDefault();

    const canvasRect = getCanvasRect();
    if (!canvasRect) return;

    const clientX = e.clientX;
    const clientY = e.clientY;
    const canvasX = clientX - canvasRect.left;
    const canvasY = clientY - canvasRect.top;

    editingRef.current = {
      mode,
      id: drawing.id,
      startMouseX: canvasX,
      startMouseY: canvasY,
      orig: { ...drawing },
    };

    setSelectedId(drawing.id);
    setChartInteraction(false);

    window.addEventListener("mousemove", handleEditMouseMove);
    window.addEventListener("mouseup", handleEditMouseUp);
  };

  const handleEditMouseMove = (ev) => {
    const edit = editingRef.current;
    if (!edit || !edit.id) return;
    const canvasRect = getCanvasRect();
    if (!canvasRect) return;
    const canvasX = ev.clientX - canvasRect.left;
    const canvasY = ev.clientY - canvasRect.top;

    const timeScale = chartRef.current?.timeScale();
    const s = candleSeriesRef.current;

    setDrawings((prev) =>
      prev.map((d) => {
        if (d.id !== edit.id) return d;
        const next = { ...d };
        if (edit.mode === "start") {
          try {
            const newTime = typeof timeScale.coordinateToTime === "function" ? timeScale.coordinateToTime(canvasX) : null;
            const newPrice = s && typeof s.coordinateToPrice === "function" ? s.coordinateToPrice(canvasY) : null;
            if (newTime != null) next.startTime = newTime;
            if (newPrice != null) next.startPrice = newPrice;
            next.startX = canvasX;
            next.startY = canvasY;
          } catch (err) {
            next.startX = canvasX;
            next.startY = canvasY;
          }
        } else if (edit.mode === "end") {
          try {
            const newTime = typeof timeScale.coordinateToTime === "function" ? timeScale.coordinateToTime(canvasX) : null;
            const newPrice = s && typeof s.coordinateToPrice === "function" ? s.coordinateToPrice(canvasY) : null;
            if (newTime != null) next.endTime = newTime;
            if (newPrice != null) next.endPrice = newPrice;
            next.endX = canvasX;
            next.endY = canvasY;
          } catch (err) {
            next.endX = canvasX;
            next.endY = canvasY;
          }
        } else if (edit.mode === "move") {
          const dx = canvasX - edit.startMouseX;
          const dy = canvasY - edit.startMouseY;
          const newStartX = (Number.isFinite(edit.orig.startX) ? edit.orig.startX : 0) + dx;
          const newEndX = (Number.isFinite(edit.orig.endX) ? edit.orig.endX : 0) + dx;
          const newStartY = (Number.isFinite(edit.orig.startY) ? edit.orig.startY : 0) + dy;
          const newEndY = (Number.isFinite(edit.orig.endY) ? edit.orig.endY : 0) + dy;

          try {
            const st = typeof timeScale.coordinateToTime === "function" ? timeScale.coordinateToTime(newStartX) : null;
            const ed = typeof timeScale.coordinateToTime === "function" ? timeScale.coordinateToTime(newEndX) : null;
            const sp = s && typeof s.coordinateToPrice === "function" ? s.coordinateToPrice(newStartY) : null;
            const ep = s && typeof s.coordinateToPrice === "function" ? s.coordinateToPrice(newEndY) : null;

            if (st != null) next.startTime = st;
            if (ed != null) next.endTime = ed;
            if (sp != null) next.startPrice = sp;
            if (ep != null) next.endPrice = ep;

            next.startX = newStartX;
            next.endX = newEndX;
            next.startY = newStartY;
            next.endY = newEndY;
          } catch (err) {
            next.startX = newStartX;
            next.endX = newEndX;
            next.startY = newStartY;
            next.endY = newEndY;
          }
        }
        return next;
      })
    );
  };

  const handleEditMouseUp = (ev) => {
    const edit = editingRef.current;
    if (!edit || !edit.id) {
      cleanupEdit();
      return;
    }

    try {
      persistDrawings(drawings);
    } catch (err) {
      setDrawings((prev) => {
        persistDrawings(prev);
        return prev;
      });
    }

    cleanupEdit();
  };

  const cleanupEdit = () => {
    editingRef.current = { mode: null, id: null, startMouseX: 0, startMouseY: 0, orig: null };
    setChartInteraction(true);
    window.removeEventListener("mousemove", handleEditMouseMove);
    window.removeEventListener("mouseup", handleEditMouseUp);
  };

  // -----------------------------------------------------------------------
  // Mouse handlers for drawing
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!chartRef.current || !containerRef.current) return;

    const series = candleSeriesRef.current;

    const handleMouseDown = (e) => {
      if (!activeTool || activeTool === "eraser") return;
      if (e.button !== 0) return;

      const canvasRect = containerRef.current.getBoundingClientRect();
      const canvas = containerRef.current.querySelector('canvas');
      if (!canvas || !canvas.getBoundingClientRect) { }

      const canvasRect2 = getCanvasRect();
      if (!canvasRect2) {
        console.warn("Canvas rect unavailable for drawing");
        return;
      }

      const canvasX = e.clientX - canvasRect2.left;
      const canvasY = e.clientY - canvasRect2.top;

      console.log("🖱️ Mouse down at (canvas coords)", canvasX, canvasY, "with tool:", activeTool);

      try {
        const timeScale = chartRef.current.timeScale();
        const time = typeof timeScale.coordinateToTime === 'function' ? timeScale.coordinateToTime(canvasX) : null;
        const price = series && typeof series.coordinateToPrice === 'function' ? series.coordinateToPrice(canvasY) : null;
        const finalPrice = price != null ? price : lastCandle?.close ?? null;

        if (time != null && finalPrice != null) {
          setChartInteraction(false);

          isDrawingRef.current = true;
          const newDrawing = {
            type: activeTool,
            startTime: time,
            startPrice: finalPrice,
            endTime: time,
            endPrice: finalPrice,
            startX: canvasX,
            startY: canvasY,
            endX: canvasX,
            endY: canvasY,
            id: Date.now(),
            createdAt: Date.now(),
          };
          setCurrentDrawing(newDrawing);
          console.log("✏️ Started drawing:", newDrawing);
        } else {
          setChartInteraction(false);
          isDrawingRef.current = true;
          const newDrawing = {
            type: activeTool,
            id: Date.now(),
            createdAt: Date.now(),
            startTime: time ?? null,
            startPrice: price ?? null,
            endTime: time ?? null,
            endPrice: price ?? null,
            startX: canvasX,
            startY: canvasY,
            endX: canvasX,
            endY: canvasY,
          };
          setCurrentDrawing(newDrawing);
          console.log("✏️ Started pixel-only drawing (fallback):", newDrawing);
        }
      } catch (err) {
        console.error("❌ Error in mouseDown:", err);
      }
    };

    const handleMouseMove = (e) => {
      if (!isDrawingRef.current || !currentDrawing) return;

      const canvasRect = getCanvasRect();
      if (!canvasRect) return;
      const canvasX = e.clientX - canvasRect.left;
      const canvasY = e.clientY - canvasRect.top;

      try {
        const timeScale = chartRef.current.timeScale();
        const time = typeof timeScale.coordinateToTime === 'function' ? timeScale.coordinateToTime(canvasX) : null;
        const price = series && typeof series.coordinateToPrice === 'function' ? series.coordinateToPrice(canvasY) : null;

        if (time != null && price != null) {
          setCurrentDrawing((prev) => ({ ...prev, endTime: time, endPrice: price, endX: canvasX, endY: canvasY }));
        } else {
          setCurrentDrawing((prev) => ({ ...prev, endX: canvasX, endY: canvasY }));
        }
      } catch (err) {
        console.warn("⚠️ Error in mouseMove:", err);
      }
    };

    const handleMouseUp = (e) => {
      if (e && e.button != null && e.button !== 0) return;

      if (isDrawingRef.current && currentDrawing) {
        try {
          const timeScale = chartRef.current.timeScale();
          const s = candleSeriesRef.current;

          const finalStartX = typeof timeScale.timeToCoordinate === 'function' && currentDrawing.startTime != null ? timeScale.timeToCoordinate(currentDrawing.startTime) : currentDrawing.startX;
          const finalEndX = typeof timeScale.timeToCoordinate === 'function' && currentDrawing.endTime != null ? timeScale.timeToCoordinate(currentDrawing.endTime) : currentDrawing.endX;

          const finalStartY = s && typeof s.priceToCoordinate === 'function' && currentDrawing.startPrice != null ? s.priceToCoordinate(currentDrawing.startPrice) : currentDrawing.startY;
          const finalEndY = s && typeof s.priceToCoordinate === 'function' && currentDrawing.endPrice != null ? s.priceToCoordinate(currentDrawing.endPrice) : currentDrawing.endY;

          const inner = getChartInnerSize();
          const width = inner.width;
          const height = inner.height;
          const left = inner.left;
          const top = inner.top;

          let finished = {
            ...currentDrawing,
            startX: finalStartX,
            endX: finalEndX,
            startY: finalStartY,
            endY: finalEndY,
            id: currentDrawing.id ?? Date.now(),
          };

          if (finished.type === "hline") {
            finished.startX = left;
            finished.endX = Math.max(left, left + width);
            if (!Number.isFinite(finished.startY) && Number.isFinite(currentDrawing.startY)) {
              finished.startY = currentDrawing.startY;
              finished.endY = currentDrawing.startY;
            }
          }

          setDrawings((prev) => {
            const next = [...prev, finished];
            persistDrawings(next);
            return next;
          });
          setCurrentDrawing(null);
          isDrawingRef.current = false;

          setSelectedId(finished.id);

          setChartInteraction(true);

          console.log("✅ Finished drawing (with pixel coords):", finished);
        } catch (err) {
          console.error("❌ Error finalizing drawing:", err);
          setDrawings((prev) => {
            const next = [...prev, { ...currentDrawing, id: Date.now() }];
            persistDrawings(next);
            return next;
          });
          setCurrentDrawing(null);
          isDrawingRef.current = false;
          setChartInteraction(true);
        }
      }
    };

    const container = containerRef.current;
    container.addEventListener("mousedown", handleMouseDown);

    const svgEl = svgRef.current;
    if (svgEl) {
      svgEl.addEventListener("mousedown", handleMouseDown);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      if (svgEl) svgEl.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeTool, currentDrawing, lastCandle, drawings]);

  // -----------------------------------------------------------------------
  // Update drawing coordinates when chart updates
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    const updateDrawings = () => {
      if (!chartRef.current) return;
      try {
        const timeScale = chartRef.current.timeScale();
        const s = candleSeriesRef.current;
        const inner = getChartInnerSize();
        const width = inner.width;
        const height = inner.height;
        const left = inner.left;
        const top = inner.top;

        setDrawings((prevDrawings) =>
          prevDrawings.map((drawing) => {
            const x1 = typeof timeScale.timeToCoordinate === 'function' ? (drawing.startTime != null ? timeScale.timeToCoordinate(drawing.startTime) : drawing.startX) : drawing.startX;
            const y1 = s && typeof s.priceToCoordinate === 'function' ? (drawing.startPrice != null ? s.priceToCoordinate(drawing.startPrice) : drawing.startY) : drawing.startY;
            const x2 = typeof timeScale.timeToCoordinate === 'function' ? (drawing.endTime != null ? timeScale.timeToCoordinate(drawing.endTime) : drawing.endX) : drawing.endX;
            const y2 = s && typeof s.priceToCoordinate === 'function' ? (drawing.endPrice != null ? s.priceToCoordinate(drawing.endPrice) : drawing.endY) : drawing.endY;

            if (x1 == null || y1 == null || x2 == null || y2 == null) {
              return drawing;
            }

            if (drawing.type === "hline") {
              return { ...drawing, startX: left, startY: y1, endX: left + Math.max(0, width), endY: y1 };
            }

            return { ...drawing, startX: x1, startY: y1, endX: x2, endY: y2 };
          })
        );

        if (currentDrawing) {
          const x1 = typeof timeScale.timeToCoordinate === 'function' ? (currentDrawing.startTime != null ? timeScale.timeToCoordinate(currentDrawing.startTime) : currentDrawing.startX) : currentDrawing.startX;
          const y1 = s && typeof s.priceToCoordinate === 'function' ? (currentDrawing.startPrice != null ? s.priceToCoordinate(currentDrawing.startPrice) : currentDrawing.startY) : currentDrawing.startY;
          const x2 = typeof timeScale.timeToCoordinate === 'function' ? (currentDrawing.endTime != null ? timeScale.timeToCoordinate(currentDrawing.endTime) : currentDrawing.endX) : currentDrawing.endX;
          const y2 = s && typeof s.priceToCoordinate === 'function' ? (currentDrawing.endPrice != null ? s.priceToCoordinate(currentDrawing.endPrice) : currentDrawing.endY) : currentDrawing.endY;

          if (x1 != null && y1 != null && x2 != null && y2 != null) {
            if (currentDrawing.type === "hline") {
              setCurrentDrawing((prev) => ({ ...prev, startX: left, startY: y1, endX: left + Math.max(0, width), endY: y1 }));
            } else {
              setCurrentDrawing((prev) => ({ ...prev, startX: x1, startY: y1, endX: x2, endY: y2 }));
            }
          }
        }
      } catch (err) {
        console.warn("Error updating drawing coordinates:", err);
      }
    };

    try {
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(updateDrawings);
    } catch (e) { }

    const id = setInterval(updateDrawings, 400);
    return () => {
      clearInterval(id);
      try {
        chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(updateDrawings);
      } catch (e) { }
    };
  }, [currentDrawing]);

  // -----------------------------------------------------------------------
  // Render SVG drawings helper
  // -----------------------------------------------------------------------
  const renderDrawings = () => {
    const allDrawings = currentDrawing ? [...drawings, currentDrawing] : drawings;
    const inner = getChartInnerSize();
    const chartWidth = inner.width;
    const chartHeight = inner.height;
    const left = inner.left;
    const top = inner.top;

    const HANDLE_RADIUS = 6;
    const HIT_THRESHOLD = 12;
    const SELECTION_STROKE_WIDTH = 1.5;

    return allDrawings.map((drawing, idx) => {
      const { startX, startY, endX, endY, type } = drawing;
      const key = drawing.id || `temp-${idx}`;
      const isSelected = selectedId === drawing.id;

      if (
        startX == null ||
        startY == null ||
        endX == null ||
        endY == null ||
        Number.isNaN(startX) ||
        Number.isNaN(startY) ||
        Number.isNaN(endX) ||
        Number.isNaN(endY)
      )
        return null;

      const onShapeMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (isDrawingRef.current) return;

        console.log("🎯 Shape clicked:", drawing.id, drawing.type);

        setSelectedId(drawing.id);

        beginEdit(e, drawing, "move");
      };

      switch (type) {
        case "trendline": {
          return (
            <g key={key}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="transparent"
                strokeWidth={16}
                strokeLinecap="round"
                onMouseDown={onShapeMouseDown}
                style={{ pointerEvents: "auto", cursor: "move" }}
              />
              {isSelected && (
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#00ff7f"
                  strokeWidth={DRAW_WIDTH + 4}
                  strokeLinecap="round"
                  opacity={0.3}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={isSelected ? "#00ff7f" : DRAW_COLOR}
                strokeWidth={DRAW_WIDTH}
                strokeLinecap="round"
                style={{ pointerEvents: "none" }}
              />
              {isSelected && (
                <>
                  <circle cx={startX} cy={startY} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto", cursor: "pointer" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "start"); }} />
                  <circle cx={endX} cy={endY} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto", cursor: "pointer" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "end"); }} />
                </>
              )}
            </g>
          );
        }

        case "hline": {
          const y = startY;
          return (
            <g key={key}>
              <line
                x1={left}
                y1={y}
                x2={left + Math.max(0, chartWidth)}
                y2={y}
                stroke="transparent"
                strokeWidth={16}
                onMouseDown={onShapeMouseDown}
                style={{ pointerEvents: "auto", cursor: "move" }}
              />
              {isSelected && (
                <line
                  x1={left}
                  y1={y}
                  x2={left + Math.max(0, chartWidth)}
                  y2={y}
                  stroke="#00ff7f"
                  strokeWidth={DRAW_WIDTH + 4}
                  strokeDasharray="6,4"
                  opacity={0.3}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <line
                x1={left}
                y1={y}
                x2={left + Math.max(0, chartWidth)}
                y2={y}
                stroke={isSelected ? "#00ff7f" : DRAW_COLOR}
                strokeWidth={DRAW_WIDTH}
                strokeDasharray="6,4"
                style={{ pointerEvents: "none" }}
              />
              {isSelected && (
                <circle cx={left + chartWidth / 2} cy={y} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto", cursor: "grab" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "move"); }} />
              )}
            </g>
          );
        }

        case "rectangle": {
          const x0 = Math.min(startX, endX);
          const y0 = Math.min(startY, endY);
          const x1 = Math.max(startX, endX);
          const y1 = Math.max(startY, endY);
          const x = Math.max(left, x0);
          const y = Math.max(top, y0);
          const w = Math.max(0, Math.min(left + chartWidth, x1) - x);
          const h = Math.max(0, Math.min(top + chartHeight, y1) - y);

          if (w <= 1 || h <= 1) {
            return (
              <g key={key}>
                <rect
                  x={x - 1}
                  y={y - 1}
                  width={Math.max(2, w)}
                  height={Math.max(2, h)}
                  fill={`${DRAW_COLOR}22`}
                  stroke={isSelected ? "#00ff7f" : DRAW_COLOR}
                  strokeWidth={DRAW_WIDTH}
                  onMouseDown={onShapeMouseDown}
                  style={{ pointerEvents: "auto", cursor: "move" }}
                />
                {isSelected && <circle cx={x} cy={y} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "start"); }} />}
              </g>
            );
          }
          return (
            <g key={key}>
              {isSelected && (
                <rect
                  x={x - 2}
                  y={y - 2}
                  width={w + 4}
                  height={h + 4}
                  fill="none"
                  stroke="#00ff7f"
                  strokeWidth={3}
                  opacity={0.3}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={`${DRAW_COLOR}22`}
                stroke={isSelected ? "#00ff7f" : DRAW_COLOR}
                strokeWidth={DRAW_WIDTH}
                onMouseDown={onShapeMouseDown}
                style={{ pointerEvents: "auto", cursor: "move" }}
              />
              {isSelected && (
                <>
                  <circle cx={startX} cy={startY} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto", cursor: "nwse-resize" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "start"); }} />
                  <circle cx={endX} cy={endY} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto", cursor: "nwse-resize" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "end"); }} />
                  <circle cx={(startX + endX) / 2} cy={(startY + endY) / 2} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto", cursor: "move" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "move"); }} />
                </>
              )}
            </g>
          );
        }

        case "fibonacci": {
          const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const minX = Math.max(left, Math.min(startX, endX));
          const maxX = Math.min(left + chartWidth, Math.max(startX, endX));
          const priceRange = (endY - startY) || 0;

          return (
            <g key={key}>
              <rect
                x={minX}
                y={Math.min(startY, endY)}
                width={maxX - minX}
                height={Math.abs(endY - startY)}
                fill="transparent"
                onMouseDown={onShapeMouseDown}
                style={{ pointerEvents: "auto", cursor: "move" }}
              />
              {isSelected && (
                <rect
                  x={minX - 2}
                  y={Math.min(startY, endY) - 2}
                  width={maxX - minX + 4}
                  height={Math.abs(endY - startY) + 4}
                  fill="none"
                  stroke="#00ff7f"
                  strokeWidth={2}
                  opacity={0.3}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <g style={{ pointerEvents: "none" }}>
                {levels.map((level) => {
                  const y = startY + priceRange * level;
                  const color = level === 0.5 ? "#ffff00" : (isSelected ? "#00ff7f" : DRAW_COLOR);
                  return (
                    <g key={level}>
                      <line x1={minX} y1={y} x2={maxX} y2={y} stroke={color} strokeWidth={1} strokeDasharray="5,4" />
                      <text x={minX + 6} y={y - 6} fill={color} fontSize="10" fontFamily="monospace">
                        {(level * 100).toFixed(1)}%
                      </text>
                    </g>
                  );
                })}
              </g>
              {isSelected && (
                <>
                  <circle cx={startX} cy={startY} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto", cursor: "pointer" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "start"); }} />
                  <circle cx={endX} cy={endY} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto", cursor: "pointer" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "end"); }} />
                </>
              )}
            </g>
          );
        }

        case "brush":
          return (
            <g key={key}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="transparent"
                strokeWidth={16}
                strokeLinecap="round"
                onMouseDown={onShapeMouseDown}
                style={{ pointerEvents: "auto", cursor: "move" }}
              />
              {isSelected && (
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#00ff7f"
                  strokeWidth={8}
                  strokeLinecap="round"
                  opacity={0.3}
                  style={{ pointerEvents: "none" }}
                />
              )}
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={isSelected ? "#00ff7f" : "#ff00ff"}
                strokeWidth={3}
                strokeLinecap="round"
                style={{ pointerEvents: "none" }}
              />
              {isSelected && (
                <circle cx={endX} cy={endY} r={HANDLE_RADIUS} fill="#00ff7f" stroke="#000" strokeWidth={SELECTION_STROKE_WIDTH} style={{ pointerEvents: "auto", cursor: "pointer" }} onMouseDown={(e) => { e.stopPropagation(); beginEdit(e, drawing, "end"); }} />
              )}
            </g>
          );

        default:
          return null;
      }
    });
  };

  // -----------------------------------------------------------------------
  // Load candles
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    let cancelled = false;
    setLoading(true);
    setFade(true);

    const loadCandles = async () => {
      try {
        const res =
          marketType === "crypto"
            ? await api.getCryptoKlines(symbol, interval, 500)
            : await api.getForexKlines(symbol, interval, 500);

        const rawCandles = res?.data?.candles ?? res?.data?.data ?? [];
        if (!rawCandles || !rawCandles.length) {
          console.warn("No candle data returned for", symbol, interval, "response:", res?.data);
          candleSeriesRef.current.setData([]);
          setLastCandle(null);
          setCandlesData([]);
          return;
        }

        const normalized = normalizeAndSortCandles(rawCandles);
        if (!normalized.length) {
          candleSeriesRef.current.setData([]);
          setLastCandle(null);
          setCandlesData([]);
          return;
        }

        for (let i = 1; i < normalized.length; i++) {
          if (!Number.isFinite(normalized[i].time) || !Number.isFinite(normalized[i - 1].time)) {
            console.error("Invalid times present before setData – bailing", {
              i,
              cur: normalized[i],
              prev: normalized[i - 1],
            });
            candleSeriesRef.current.setData([]);
            setLastCandle(null);
            setCandlesData([]);
            return;
          }
          if (normalized[i].time <= normalized[i - 1].time) {
            console.warn("Non-increasing time after normalization at index", i, normalized[i], normalized[i - 1]);
          }
        }

        try {
          candleSeriesRef.current.setData(normalized);
          setLastCandle(normalized.at(-1));
          setCandlesData(normalized);
        } catch (err) {
          console.error("Failed to setData on series (chart assertion). Dumping head/tail + attempting fallback:", err, {
            head: normalized.slice(0, 6),
            tail: normalized.slice(-6),
            length: normalized.length,
          });

          const lastChunk = normalized.slice(-200);
          try {
            candleSeriesRef.current.setData(lastChunk);
            setLastCandle(lastChunk.at(-1));
            setCandlesData(lastChunk);
          } catch (err2) {
            console.error("Fallback setData also failed:", err2);
            candleSeriesRef.current.setData([]);
            setLastCandle(null);
            setCandlesData([]);
          }
        }
      } catch (err) {
        console.error("Error loading candles:", err);
        try {
          candleSeriesRef.current.setData([]);
        } catch (e) { }
        setLastCandle(null);
        setCandlesData([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTimeout(() => setFade(false), 300);
        }
      }
    };

    try {
      candleSeriesRef.current.setData([]);
    } catch (e) { }
    setLastCandle(null);
    setCandlesData([]);
    loadCandles();

    return () => {
      cancelled = true;
    };
  }, [symbol, marketType, interval]);

  // -----------------------------------------------------------------------
  // When candlesData or chart become available, ensure drawings are projected
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    setDrawings((prev) => {
      const needProjection = prev.some(d => !(Number.isFinite(d.startX) && Number.isFinite(d.startY) && Number.isFinite(d.endX) && Number.isFinite(d.endY)));
      if (!needProjection) return prev;
      isRestoringRef.current = true;
      const projected = projectDrawingsToPixels(prev);
      setTimeout(() => { isRestoringRef.current = false; }, 300);
      return projected;
    });
  }, [candlesData]);

  // -----------------------------------------------------------------------
  // Countdown
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!lastCandle) {
      setRemainingSec(null);
      return;
    }
    const intervalSec = intervalToSeconds(interval);

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const nextClose = (Math.floor(now / intervalSec) + 1) * intervalSec;
      setRemainingSec(Math.max(0, nextClose - now));
    };

    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [lastCandle, interval]);

  // -----------------------------------------------------------------------
  // Live update
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!lastCandle) return;
    let cancelled = false;
    const intervalSec = intervalToSeconds(interval);

    const updateLatest = async () => {
      try {
        const res = await api.getLatestPrice(marketType, symbol);
        const priceRaw = res?.data?.price;
        if (priceRaw == null) return;

        const price = Number(priceRaw);
        if (!Number.isFinite(price)) return;

        let priceTsSec = null;
        if (res.data?.timestamp) {
          const t = Number(res.data.timestamp);
          if (!Number.isNaN(t)) priceTsSec = t > 1e12 ? Math.floor(t / 1000) : Math.floor(t);
        }
        if (!priceTsSec) priceTsSec = Math.floor(Date.now() / 1000);

        if (cancelled) return;
        if (!lastCandle || !candleSeriesRef.current) return;

        const priceBucketStart = Math.floor(priceTsSec / intervalSec) * intervalSec;
        const lastBucketStart = Math.floor(lastCandle.time / intervalSec) * intervalSec;

        if (priceBucketStart > lastBucketStart) {
          const newCandle = {
            time: priceBucketStart,
            open: lastCandle.close,
            high: Math.max(lastCandle.close, price),
            low: Math.min(lastCandle.close, price),
            close: price,
          };
          try {
            candleSeriesRef.current.update(newCandle);
            setLastCandle(newCandle);
            setCandlesData((prev) => [...prev, newCandle]);
          } catch (err) {
            console.warn("Update for new bucket failed", err);
          }
        } else {
          const updated = {
            ...lastCandle,
            close: price,
            high: Math.max(lastCandle.high, price),
            low: Math.min(lastCandle.low, price),
          };
          try {
            candleSeriesRef.current.update(updated);
            setLastCandle(updated);
            setCandlesData((prev) => {
              const newData = [...prev];
              newData[newData.length - 1] = updated;
              return newData;
            });
          } catch (err) {
            console.warn("Update for current bucket failed:", err);
          }
        }
      } catch (err) {
        console.warn("Latest price fetch failed:", err);
      }
    };

    updateLatest();
    const id = setInterval(updateLatest, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [lastCandle, marketType, symbol, interval]);

  const priceColor = lastCandle
    ? lastCandle.close >= lastCandle.open
      ? "text-green-400"
      : "text-red-400"
    : "text-gray-400";

  const removeDrawing = (id) => {
    setDrawings((prev) => {
      const next = prev.filter((d) => d.id !== id);
      persistDrawings(next);
      return next;
    });
    if (selectedId === id) setSelectedId(null);
  };

  const clearAllDrawings = () => {
    setDrawings([]);
    try {
      localStorage.removeItem(storageKey());
    } catch (e) {
      console.warn("Failed to remove drawings from storage:", e);
    }
    setSelectedId(null);
  };

  // تابع حذف اندیکاتور
  // const removeIndicator = (indicatorId) => {
  //   console.log("🗑️ Removing indicator:", indicatorId);

  //   // حذف از لیست فعال
  //   setActiveIndicators((prev) => prev.filter(ind => ind.id !== indicatorId));

  //   // حذف سریال و چارت‌های مربوطه
  //   Object.keys(indicatorSeriesRef.current).forEach((key) => {
  //     if (key.startsWith(indicatorId)) {
  //       const item = indicatorSeriesRef.current[key];
  //       if (item && typeof item.remove === 'function') {
  //         item.remove();
  //       }
  //       delete indicatorSeriesRef.current[key];
  //     }
  //   });
  // };

  useEffect(() => {
    persistDrawings(drawings);
  }, [drawings, symbol, interval, marketType]);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key) return;
      if (e.key !== storageKey()) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (!parsed) return;
        const loaded = parsed.drawings ?? [];
        if (chartRef.current && candleSeriesRef.current) {
          const mapped = projectDrawingsToPixels(loaded);
          setDrawings(mapped);
        } else {
          setDrawings(loaded.map((d) => ({ ...d, startX: d.startX ?? null, startY: d.startY ?? null, endX: d.endX ?? null, endY: d.endY ?? null })));
        }
      } catch (err) {
        console.warn("storage event parse failed:", err);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [symbol, interval, marketType]);

  useEffect(() => {
    const onBackgroundClick = (e) => {
      if (isDrawingRef.current) return;
      if (editingRef.current && editingRef.current.id) return;
      setSelectedId(null);
    };
    window.addEventListener("click", onBackgroundClick);
    return () => window.removeEventListener("click", onBackgroundClick);
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div
      className={`flex-1 flex flex-col h-full border border-gray-800 bg-[#0b0f14] rounded-lg overflow-hidden transition-opacity duration-300 ${fade ? "opacity-40" : "opacity-100"
        }`}
    >
      <ChartToolbar onShowIndicators={() => setShowIndicatorModal(true)} />

      <IndicatorModal isOpen={showIndicatorModal} onClose={() => setShowIndicatorModal(false)} />

      <div className="p-3 bg-[#071017] border-b border-gray-800 text-gray-300 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <strong>{symbol}</strong>
          <span className="text-sm text-gray-400">• {marketType} • {interval}</span>
          {/* {activeTool && (
            <span className="ml-2 text-xs px-2 py-1 bg-[#00ff7f]/20 text-[#00ff7f] rounded">🔧 {activeTool}</span>
          )} */}
          {/* indicator badges could go here */}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              console.log("📊 Opening indicator modal");
              setShowIndicatorModal(true);
            }}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
          >
            + Indicators
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowManageIndicators(s => !s)}
              className="ml-2 px-3 py-1 bg-gray-800/80 text-xs rounded border border-gray-700 hover:bg-gray-700/20"
            >
              ⚙️ Manage indicators
            </button>
            {showManageIndicators && (
              <div
                className="bg-[#071017] border border-gray-700 rounded p-2 text-xs text-gray-200"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  minWidth: 260,
                  maxWidth: 360,
                  zIndex: 10002,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <strong className="text-sm">Indicators</strong>
                  <div>
                    <button onClick={() => setShowManageIndicators(false)} className="ml-2 px-2 py-0.5 rounded hover:bg-gray-700/20">Close</button>
                  </div>
                </div>

                <div style={{ maxHeight: 260, overflow: "auto" }}>
                  {activeIndicators.length === 0 && <div className="text-gray-400">No indicators added</div>}
                  {activeIndicators.map(ind => (
                    <div key={ind.id} className="flex items-center justify-between bg-[#0b1114] p-1 rounded mb-1">
                      <div>
                        <div className="text-xs font-medium">{ind.name} {ind.defaultParams ? `(${Object.values(ind.defaultParams).join(',')})` : ''}</div>
                        <div className="text-[10px] text-gray-400">{ind.description || ind.id}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            try { removeIndicator(ind.id); } catch (e) { console.warn(e); }
                          }}
                          className="text-red-400 px-2 py-0.5 rounded hover:bg-red-600/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowManageDrawings(s => !s)} className="px-3 py-1 bg-gray-800/80 text-xs rounded border border-gray-700 hover:bg-gray-700/20">
              ✏️ Manage drawings
            </button>
            {showManageDrawings && (
              <div
                className="bg-[#071017] border border-gray-700 rounded p-2 text-xs text-gray-200"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  minWidth: 260,
                  maxWidth: 320,
                  zIndex: 10002,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <strong className="text-sm">Drawings</strong>
                  <div>
                    <button onClick={() => clearAllDrawings()} className="text-red-400 px-2 py-0.5 rounded hover:bg-red-600/10">Clear all</button>
                    <button onClick={() => setShowManageDrawings(false)} className="ml-2 px-2 py-0.5 rounded hover:bg-gray-700/20">Close</button>
                  </div>
                </div>
                <div style={{ maxHeight: 260, overflow: "auto" }}>
                  {drawings.length === 0 && <div className="text-gray-400">No drawings</div>}
                  {drawings.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-[#0b1114] p-1 rounded mb-1">
                      <div>
                        <div className="text-xs">{d.type}</div>
                        <div className="text-[10px] text-gray-400">id: {d.id}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => removeDrawing(d.id)} className="text-red-400 px-2 py-0.5 rounded hover:bg-red-600/10">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-400">
            {loading ? "Loading..." : lastCandle ? <span className={priceColor}>C: {lastCandle.close.toFixed(4)}</span> : "No data"}
          </div>

          <div className="text-xs text-gray-400">{remainingSec != null ? `⏱️ ${formatRemaining(remainingSec)}` : "–"}</div>
        </div>
      </div>

      {/* Container اصلی با فضای کافی برای indicator panels */}
      <div className="flex-1 flex flex-col overflow-auto p-2 gap-2">
        {/* چارت اصلی */}
        <div className="relative" style={{ minHeight: '400px', flex: '1 1 auto' }}>
          <div ref={containerRef} className="absolute inset-0" />
          <svg
            ref={svgRef}
            className="absolute inset-0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            style={{ zIndex: 1, pointerEvents: "auto" }}
          >
            {renderDrawings()}
          </svg>
        </div>

      </div>
    </div>
  );
}
