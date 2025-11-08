import React, { useEffect, useRef, useState, useCallback } from "react";
import { FaChartLine, FaRuler, FaArrowsAltH, FaDraftingCompass, FaSquare, FaEraser, FaMagic, FaTimes, FaSearch } from "react-icons/fa";

// ***************************************************************
// 1. MOCK API (Replaces: ../api/api)
//    - Simulates fetching historical and real-time data.
// ***************************************************************
const mockData = [
  { time: 1672531200, open: 16500, high: 16800, low: 16400, close: 16750 },
  { time: 1672617600, open: 16750, high: 16900, low: 16650, close: 16850 },
  { time: 1672704000, open: 16850, high: 17100, low: 16800, close: 17050 },
  { time: 1672790400, open: 17050, high: 17200, low: 16950, close: 17150 },
  { time: 1672876800, open: 17150, high: 17350, low: 17000, close: 17250 },
  { time: 1672963200, open: 17250, high: 17500, low: 17200, close: 17400 },
  { time: 1673049600, open: 17400, high: 17600, low: 17300, close: 17500 },
  { time: 1673136000, open: 17500, high: 17800, low: 17450, close: 17750 },
  { time: 1673222400, open: 17750, high: 17900, low: 17700, close: 17850 },
  { time: 1673308800, open: 17850, high: 18100, low: 17800, close: 18050 },
  { time: 1673395200, open: 18050, high: 18300, low: 17950, close: 18200 },
  { time: 1673481600, open: 18200, high: 18350, low: 18100, close: 18300 },
  { time: 1673568000, open: 18300, high: 18500, low: 18250, close: 18450 },
  { time: 1673654400, open: 18450, high: 18550, low: 18350, close: 18500 },
  { time: 1673740800, open: 18500, high: 18700, low: 18400, close: 18650 },
  { time: 1673827200, open: 18650, high: 18750, low: 18550, close: 18700 },
  { time: 1673913600, open: 18700, high: 18900, low: 18600, close: 18850 },
  { time: 1674000000, open: 18850, high: 18950, low: 18750, close: 18900 },
  { time: 1674086400, open: 18900, high: 19100, low: 18800, close: 19050 },
  { time: 1674172800, open: 19050, high: 19150, low: 18950, close: 19000 },
  { time: 1674259200, open: 19000, high: 19200, low: 18900, close: 19100 },
  { time: 1674345600, open: 19100, high: 19300, low: 19000, close: 19250 },
  { time: 1674432000, open: 19250, high: 19400, low: 19150, close: 19350 },
  { time: 1674518400, open: 19350, high: 19500, low: 19250, close: 19450 },
  { time: 1674604800, open: 19450, high: 19600, low: 19350, close: 19550 },
  { time: 1674691200, open: 19550, high: 19700, low: 19450, close: 19650 },
  { time: 1674777600, open: 19650, high: 19800, low: 19550, close: 19750 },
  { time: 1674864000, open: 19750, high: 19900, low: 19650, close: 19850 },
  { time: 1674950400, open: 19850, high: 20000, low: 19750, close: 19950 },
  { time: 1675036800, open: 19950, high: 20100, low: 19850, close: 20050 },
];

const api = {
  fetchHistoricalData: async (symbol, interval, fetchStart, fetchEnd) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockData;
  },
  fetchLatestPrice: async (symbol, interval) => {
    const last = mockData[mockData.length - 1];
    const newClose = last.close + (Math.random() * 200 - 100);
    return {
      time: last.time + 86400,
      open: last.close,
      high: Math.max(last.close, newClose + 50),
      low: Math.min(last.close, newClose - 50),
      close: newClose,
    };
  }
};

// ***************************************************************
// 2. INDICATORS LOGIC
// ***************************************************************

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

function _smaArray(candles, period) {
  const out = new Array(candles.length).fill(null);
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += Number(candles[i].close);
    if (i >= period - 1) {
      if (i > period - 1) {
        sum -= Number(candles[i - period].close);
      }
      out[i] = sum / period;
    }
  }
  return out;
}

const calculateSMA = (candles, { period }) => {
  const smaValues = _smaArray(candles, period);
  return candles.map((c, i) => ({
    time: c.time,
    value: smaValues[i] !== null ? parseFloat(smaValues[i].toFixed(4)) : null,
  }));
};

function _emaFromNumericArray(data, period) {
  const out = new Array(data.length).fill(null);
  const k = 2 / (period + 1);
  let ema = null;
  for (let i = 0; i < data.length; i++) {
    const price = data[i];
    if (price === null || isNaN(price)) {
      out[i] = null;
      continue;
    }
    if (ema === null) {
      ema = price;
    } else {
      ema = price * k + ema * (1 - k);
    }
    out[i] = ema;
  }
  return out;
}

const calculateEMA = (candles, { period }) => {
  const closePrices = candles.map(c => Number(c.close));
  const emaValues = _emaFromNumericArray(closePrices, period);
  return candles.map((c, i) => ({
    time: c.time,
    value: emaValues[i] !== null ? parseFloat(emaValues[i].toFixed(4)) : null,
  }));
};

const calculateRSI = (candles, { period = 14 }) => {
  const closes = candles.map(c => Number(c.close));
  const out = new Array(candles.length).fill(null);
  if (closes.length <= period) return candles.map((c, i) => ({ time: c.time, value: null }));

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = ((avgGain * (period - 1)) + gain) / period;
    avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    const rs = avgLoss === 0 ? Infinity : (avgGain / avgLoss);
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    out[i] = parseFloat(rsi.toFixed(4));
  }

  return candles.map((c, i) => ({ time: c.time, value: out[i] !== null ? out[i] : null }));
};

const calculateMACD = (candles, { fast = 12, slow = 26, signal = 9 }) => {
  const closes = candles.map(c => Number(c.close));
  const fastEma = _emaFromNumericArray(closes, fast);
  const slowEma = _emaFromNumericArray(closes, slow);
  const macdArray = new Array(closes.length).fill(null);

  for (let i = 0; i < closes.length; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      macdArray[i] = fastEma[i] - slowEma[i];
    }
  }

  const signalEma = _emaFromNumericArray(macdArray.map(v => v === null ? null : v), signal);
  const histArray = new Array(closes.length).fill(null);
  for (let i = 0; i < closes.length; i++) {
    if (macdArray[i] !== null && signalEma[i] !== null) {
      histArray[i] = macdArray[i] - signalEma[i];
    }
  }

  return candles.map((c, i) => ({
    time: c.time,
    macd: macdArray[i] !== null ? parseFloat(macdArray[i].toFixed(4)) : null,
    signal: signalEma[i] !== null ? parseFloat(signalEma[i].toFixed(4)) : null,
    hist: histArray[i] !== null ? parseFloat(histArray[i].toFixed(4)) : null,
  }));
};

const indicatorCalculators = {
  ema: calculateEMA,
  rsi: calculateRSI,
  macd: calculateMACD,
  sma: calculateSMA,
};

// ***************************************************************
// 4. CHART UTILITIES
// ***************************************************************
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
  for (let i = 0; i < raw.length; i++) {
    const d = raw[i];
    const timeSec = parseTimeToSec(d.time);
    const open = Number(d.open);
    const high = Number(d.high);
    const low = Number(d.low);
    const close = Number(d.close);

    const ok = Number.isFinite(timeSec)
      && Number.isFinite(open)
      && Number.isFinite(high)
      && Number.isFinite(low)
      && Number.isFinite(close);

    if (ok) {
      mapped.push({ time: timeSec, open, high, low, close });
    }
  }
  mapped.sort((a, b) => a.time - b.time);
  return mapped;
}

const drawings = [];

// ***************************************************************
// 5. IndicatorModal Component
// ***************************************************************

function IndicatorModal({ isOpen, onClose } = {}) {
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
    if (!isOpen) setSearch("");
  }, [isOpen]);

  const choose = (ind) => {
    const detail = { indicator: ind };
    window.dispatchEvent(new CustomEvent('tvmini:add:indicator', { detail }));
    if (typeof onClose === "function") onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
      <div className="bg-[#101820] rounded-xl shadow-2xl w-full max-w-lg border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 sticky top-0 bg-[#101820] z-10">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <FaChartLine className="text-blue-400" /> اندیکاتورها (Indicators)
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
              placeholder="Search Indicators (RSI, MACD, EMA, ...)"
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
                className="w-full text-left px-4 py-3 hover:bg-[#131821] transition-colors flex flex-col justify-start border-b border-gray-800 last:border-b-0"
              >
                <div className="flex items-center justify-between w-full">
                    <div className="text-sm font-medium text-gray-100">{ind.name} (پارامتر پیش‌فرض: {ind.defaultParams ? Object.values(ind.defaultParams).join(', ') : 'Default'})</div>
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

// ***************************************************************
// 6. ChartToolbar Component
// ***************************************************************
const TOOL_LIST = [
  { id: "trendline", name: "خط روند (Trendline)", icon: <FaRuler /> },
  { id: "hline", name: "خط افقی (Horizontal Line)", icon: <FaArrowsAltH /> },
  { id: "fibonacci", name: "فیبوناچی (Fibonacci)", icon: <FaDraftingCompass /> },
  { id: "rectangle", name: "مستطیل (Rectangle)", icon: <FaSquare /> },
  { id: "brush", name: "قلم (Brush)", icon: <FaMagic /> },
  { id: "eraser", name: "پاک‌کن (Eraser)", icon: <FaEraser /> },
];

function ChartToolbar({ initialTool = null } = {}) {
  const [active, setActive] = useState(initialTool);

  const handleClick = (tool) => {
    const next = active === tool ? null : tool;
    setActive(next);

    const detail = { tool: next };
    window.dispatchEvent(new CustomEvent('tvmini:tool:selected', { detail }));
  };

  return (
    <div className="absolute top-4 left-4 z-50">
      <div className="flex gap-2 bg-[#101820cc] backdrop-blur-md rounded-xl p-2 shadow-lg border border-gray-800">
        {TOOL_LIST.map((t) => (
          <button
            key={t.id}
            onClick={() => handleClick(t.id)}
            title={t.name}
            className={`w-10 h-10 flex items-center justify-center rounded-lg text-gray-200 transition-all duration-150
              ${active === t.id ? "bg-blue-600 shadow-md ring-2 ring-blue-400 scale-105" : "hover:bg-[#1f2835] hover:text-white"}`}
          >
            {t.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ***************************************************************
// 7. ChartContainer Component (با پشتیبانی کامل از RSI و MACD)
// ***************************************************************

function ChartContainer({ symbol, marketType, interval, fade, fetchStart, fetchEnd, setShowIndicatorModal }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const activeIndicatorsRef = useRef([]);

  const [loading, setLoading] = useState(true);
  const [candles, setCandles] = useState([]);
  const [lastCandle, setLastCandle] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [drawingState, setDrawingState] = useState(null);
  const [activeIndicators, setActiveIndicators] = useState([]);

  // --------------------------------------------------------------------------------
  // 7.1 CHART INITIALIZATION
  // --------------------------------------------------------------------------------
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!window.LightweightCharts || !window.LightweightCharts.createChart) {
        console.error("Lightweight Charts is not loaded. Ensure CDN script is included.");
        return;
    }

    const chartOptions = {
      layout: {
        background: { color: "#0b0f14" },
        textColor: "rgba(255, 255, 255, 0.9)",
      },
      grid: {
        vertLines: { color: "rgba(197, 203, 207, 0.1)" },
        horzLines: { color: "rgba(197, 203, 207, 0.1)" },
      },
      rightPriceScale: {
        borderColor: "rgba(197, 203, 207, 0.8)",
      },
      timeScale: {
        borderColor: "rgba(197, 203, 207, 0.8)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    };

    const chart = window.LightweightCharts.createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    const newCandleSeries = chart.addCandlestickSeries({
      upColor: "rgb(67, 160, 71)",
      downColor: "rgb(229, 57, 53)",
      borderDownColor: "rgb(229, 57, 53)",
      borderUpColor: "rgb(67, 160, 71)",
      wickDownColor: "rgb(229, 57, 53)",
      wickUpColor: "rgb(67, 160, 71)",
    });
    candleSeriesRef.current = newCandleSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        chart.applyOptions({ 
          width: entries[0].contentRect.width, 
          height: entries[0].contentRect.height 
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.unobserve(chartContainerRef.current);
      chart.remove();
    };
  }, []);

  // --------------------------------------------------------------------------------
  // 7.2 DATA FETCHING AND UPDATING
  // --------------------------------------------------------------------------------

  const recalculateAllIndicators = useCallback((data) => {
    activeIndicatorsRef.current.forEach(indicator => {
      const { id, defaultParams } = indicator;
      const calculator = indicatorCalculators[id];
      
      if (!calculator) return;

      try {
        const calculatedData = calculator(data, defaultParams);
        const seriesInfo = indicatorSeriesRef.current[id];

        if (!seriesInfo) return;

        if (id === "ema" || id === "sma") {
          const formattedData = calculatedData
            .filter(d => d.value !== null)
            .map(d => ({ time: d.time, value: d.value }));
          seriesInfo.series[0].setData(formattedData);
        } else if (id === "rsi") {
          const formattedData = calculatedData
            .filter(d => d.value !== null)
            .map(d => ({ time: d.time, value: d.value }));
          seriesInfo.series[0].setData(formattedData);
        } else if (id === "macd") {
          const macdLine = calculatedData.filter(d => d.macd !== null).map(d => ({ time: d.time, value: d.macd }));
          const signalLine = calculatedData.filter(d => d.signal !== null).map(d => ({ time: d.time, value: d.signal }));
          const histData = calculatedData.filter(d => d.hist !== null).map(d => ({ 
            time: d.time, 
            value: d.hist,
            color: d.hist >= 0 ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
          }));

          seriesInfo.series[0].setData(macdLine);
          seriesInfo.series[1].setData(signalLine);
          seriesInfo.series[2].setData(histData);
        }
      } catch (err) {
        console.error(`Error recalculating indicator ${id}:`, err);
      }
    });
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !symbol || !interval) return;

    setLoading(true);
    setCandles([]);
    setLastCandle(null);

    const fetchData = async () => {
      try {
        const rawData = await api.fetchHistoricalData(symbol, interval, fetchStart, fetchEnd);
        const normalized = normalizeAndSortCandles(rawData);
        setCandles(normalized);

        candleSeriesRef.current.setData(normalized);

        if (normalized.length > 0) {
          setLastCandle(normalized[normalized.length - 1]);
        }

        recalculateAllIndicators(normalized);

        setLoading(false);
      } catch (err) {
        console.error("Historical data fetch failed:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, interval, fetchStart, fetchEnd, recalculateAllIndicators]);

  useEffect(() => {
    if (!symbol || !interval || !lastCandle) return;

    let cancelled = false;
    const series = candleSeriesRef.current;

    const updateLatest = async () => {
      if (cancelled || !series) return;

      try {
        const latestRaw = await api.fetchLatestPrice(symbol, interval);
        if (cancelled) return;

        const latestNormalized = normalizeAndSortCandles([latestRaw])[0];

        if (latestNormalized) {
          if (latestNormalized.time === lastCandle.time) {
            series.update(latestNormalized);
            setLastCandle(latestNormalized);
          } else if (latestNormalized.time > lastCandle.time) {
            series.update(latestNormalized);
            setLastCandle(latestNormalized);
          }
        }
      } catch (err) {
        if (!cancelled) console.error("Latest price fetch failed:", err);
      }
    };

    updateLatest();
    const id = setInterval(updateLatest, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, [lastCandle, marketType, symbol, interval]);

  // --------------------------------------------------------------------------------
  // 7.3 INDICATOR LOGIC (با پشتیبانی کامل از RSI و MACD در پنل‌های جداگانه)
  // --------------------------------------------------------------------------------

  const removeIndicator = useCallback((id) => {
    const seriesInfo = indicatorSeriesRef.current[id];
    if (seriesInfo && chartRef.current) {
      try {
        if (seriesInfo.series && Array.isArray(seriesInfo.series)) {
          seriesInfo.series.forEach(s => {
            try { chartRef.current.removeSeries(s); } catch (e) {}
          });
        }
      } catch (err) {
        console.error("Error while removing indicator series:", err);
      }

      delete indicatorSeriesRef.current[id];
      
      activeIndicatorsRef.current = activeIndicatorsRef.current.filter(ind => ind.id !== id);
      setActiveIndicators(prev => prev.filter(ind => ind.id !== id));
      
      console.log(`Indicator ${id} removed.`);
    }
  }, []);

  const handleIndicatorAdd = useCallback((indicator, candlesData) => {
    const { id, defaultParams, name } = indicator;

    if (indicatorSeriesRef.current[id]) {
      removeIndicator(id);
      return;
    }

    const calculator = indicatorCalculators[id];
    if (!calculator) {
      console.error(`Calculator for indicator ${id} not found.`);
      return;
    }

    try {
      const calculatedData = calculator(candlesData, defaultParams);

      if (id === "ema" || id === "sma") {
        const lineSeries = chartRef.current.addLineSeries({
          color: id === "ema" ? "#2196F3" : "#FF9800",
          lineWidth: 2,
          priceScaleId: 'right',
          lastValueVisible: true,
          priceLineVisible: false,
        });

        const formattedData = calculatedData
          .filter(d => d.value !== null)
          .map(d => ({ time: d.time, value: d.value }));

        lineSeries.setData(formattedData);
        indicatorSeriesRef.current[id] = { series: [lineSeries], type: 'overlay' };
        
        activeIndicatorsRef.current.push(indicator);
        setActiveIndicators(prev => [...prev, indicator]);
        
        console.log(`Indicator ${name} added successfully.`);
      } else if (id === "rsi") {
        // ایجاد پنل جداگانه برای RSI
        const rsiChart = window.LightweightCharts.createChart(chartContainerRef.current, {
          layout: {
            background: { color: "#0b0f14" },
            textColor: "rgba(255, 255, 255, 0.9)",
          },
          grid: {
            vertLines: { color: "rgba(197, 203, 207, 0.05)" },
            horzLines: { color: "rgba(197, 203, 207, 0.05)" },
          },
          rightPriceScale: {
            borderColor: "rgba(197, 203, 207, 0.8)",
          },
          timeScale: {
            borderColor: "rgba(197, 203, 207, 0.8)",
            timeVisible: true,
            visible: false,
          },
          width: chartContainerRef.current.clientWidth,
          height: 150,
        });

        const rsiSeries = rsiChart.addLineSeries({
          color: "#9C27B0",
          lineWidth: 2,
          priceScaleId: 'right',
          lastValueVisible: true,
          priceLineVisible: false,
        });

        // افزودن خطوط 30 و 70 برای RSI
        const rsiUpperLine = rsiChart.addLineSeries({
          color: 'rgba(255, 82, 82, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'right',
          lastValueVisible: false,
          priceLineVisible: false,
        });

        const rsiLowerLine = rsiChart.addLineSeries({
          color: 'rgba(76, 175, 80, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'right',
          lastValueVisible: false,
          priceLineVisible: false,
        });

        const formatted = calculatedData.filter(d => d.value !== null).map(d => ({ time: d.time, value: d.value }));
        rsiSeries.setData(formatted);

        // خطوط 70 و 30
        const upperLineData = formatted.map(d => ({ time: d.time, value: 70 }));
        const lowerLineData = formatted.map(d => ({ time: d.time, value: 30 }));
        rsiUpperLine.setData(upperLineData);
        rsiLowerLine.setData(lowerLineData);

        // تنظیم محدوده قیمت برای RSI (0-100)
        rsiChart.priceScale('right').applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        });

        // همگام‌سازی TimeScale با چارت اصلی
        rsiChart.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
          if (chartRef.current) {
            chartRef.current.timeScale().setVisibleLogicalRange(timeRange);
          }
        });

        chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
          rsiChart.timeScale().setVisibleLogicalRange(timeRange);
        });

        indicatorSeriesRef.current[id] = { 
          series: [rsiSeries, rsiUpperLine, rsiLowerLine], 
          chart: rsiChart,
          type: 'pane' 
        };
        
        activeIndicatorsRef.current.push(indicator);
        setActiveIndicators(prev => [...prev, indicator]);
        
        console.log(`RSI indicator added in separate pane.`);

      } else if (id === "macd") {
        // ایجاد پنل جداگانه برای MACD
        const macdChart = window.LightweightCharts.createChart(chartContainerRef.current, {
          layout: {
            background: { color: "#0b0f14" },
            textColor: "rgba(255, 255, 255, 0.9)",
          },
          grid: {
            vertLines: { color: "rgba(197, 203, 207, 0.05)" },
            horzLines: { color: "rgba(197, 203, 207, 0.05)" },
          },
          rightPriceScale: {
            borderColor: "rgba(197, 203, 207, 0.8)",
          },
          timeScale: {
            borderColor: "rgba(197, 203, 207, 0.8)",
            timeVisible: true,
            visible: false,
          },
          width: chartContainerRef.current.clientWidth,
          height: 150,
        });

        const macdLineSeries = macdChart.addLineSeries({
          color: "#4CAF50",
          lineWidth: 2,
          priceScaleId: 'right',
          lastValueVisible: true,
          priceLineVisible: false,
        });

        const signalLineSeries = macdChart.addLineSeries({
          color: "#FF9800",
          lineWidth: 2,
          priceScaleId: 'right',
          lastValueVisible: true,
          priceLineVisible: false,
        });

        const histSeries = macdChart.addHistogramSeries({
          color: '#26a69a',
          priceFormat: {
            type: 'volume',
          },
          priceScaleId: 'right',
          lastValueVisible: false,
          priceLineVisible: false,
        });

        const macdLine = calculatedData.filter(d => d.macd !== null).map(d => ({ time: d.time, value: d.macd }));
        const signalLine = calculatedData.filter(d => d.signal !== null).map(d => ({ time: d.time, value: d.signal }));
        const histData = calculatedData.filter(d => d.hist !== null).map(d => ({ 
          time: d.time, 
          value: d.hist,
          color: d.hist >= 0 ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        }));

        macdLineSeries.setData(macdLine);
        signalLineSeries.setData(signalLine);
        histSeries.setData(histData);

        // همگام‌سازی TimeScale با چارت اصلی
        macdChart.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
          if (chartRef.current) {
            chartRef.current.timeScale().setVisibleLogicalRange(timeRange);
          }
        });

        chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
          macdChart.timeScale().setVisibleLogicalRange(timeRange);
        });

        indicatorSeriesRef.current[id] = { 
          series: [macdLineSeries, signalLineSeries, histSeries], 
          chart: macdChart,
          type: 'pane' 
        };
        
        activeIndicatorsRef.current.push(indicator);
        setActiveIndicators(prev => [...prev, indicator]);
        
        console.log(`MACD indicator added in separate pane.`);
      } else {
        console.warn(`Indicator ${name} rendering not fully implemented.`);
      }

    } catch (err) {
      console.error(`Error calculating or adding indicator ${name}:`, err);
    }
  }, [removeIndicator]);

  useEffect(() => {
    const handler = (event) => {
      const indicator = event.detail?.indicator;
      if (indicator && candles.length > 0) {
        handleIndicatorAdd(indicator, candles);
      }
    };

    window.addEventListener('tvmini:add:indicator', handler);
    return () => window.removeEventListener('tvmini:add:indicator', handler);
  }, [candles, handleIndicatorAdd]);

  // --------------------------------------------------------------------------------
  // 7.4 DRAWING TOOL LOGIC
  // --------------------------------------------------------------------------------

  useEffect(() => {
    const handler = (event) => {
      const toolId = event.detail?.tool;
      setActiveTool(toolId);
      setDrawingState(null);
      console.log("Active Tool Set:", toolId);
    };

    window.addEventListener('tvmini:tool:selected', handler);
    return () => window.removeEventListener('tvmini:tool:selected', handler);
  }, []);

  const handleChartClick = useCallback((param) => {
    if (!param.point || !activeTool || !candleSeriesRef.current) return;
    if (!param.point.x || !param.point.y || !param.time) return;

    const time = param.time;
    const price = candleSeriesRef.current.coordinateToPrice(param.point.y);

    if (activeTool === 'trendline') {
      if (!drawingState || drawingState.step === 1) {
        setDrawingState({ tool: 'trendline', step: 2, p1: { time, price, point: param.point } });
        console.log("Trendline start point captured:", { time, price });
      } else if (drawingState.step === 2) {
        const p2 = { time, price, point: param.point };
        const newDrawing = { id: Date.now(), tool: 'trendline', p1: drawingState.p1, p2: p2 };
        drawings.push(newDrawing);

        console.log("Trendline completed:", newDrawing);

        setActiveTool(null);
        setDrawingState(null);
        window.dispatchEvent(new CustomEvent('tvmini:tool:selected', { detail: { tool: null } }));
      }
    }
  }, [activeTool, drawingState]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (activeTool) {
      chart.subscribeClick(handleChartClick);
    } else {
      chart.unsubscribeClick(handleChartClick);
    }

    return () => {
      chart.unsubscribeClick(handleChartClick);
    };
  }, [activeTool, handleChartClick]);

  const priceColor = lastCandle
    ? lastCandle.close >= lastCandle.open ? "text-green-400" : "text-red-400"
    : "text-gray-400";

  return (
    <div
      className={`flex-1 flex flex-col h-full border border-gray-800 bg-[#0b0f14] rounded-lg overflow-hidden transition-opacity duration-300 ${fade ? "opacity-40" : "opacity-100"}`}
    >
      <div className="p-3 bg-[#071017] border-b border-gray-800 text-gray-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <strong className="text-white">{symbol}</strong>
          <span className="text-sm text-gray-400">• {marketType} • {interval}</span>
          {activeIndicators.length > 0 && (
            <div className="flex items-center gap-2">
              {activeIndicators.map(ind => (
                <span key={ind.id} className="text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded flex items-center gap-1">
                  📊 {ind.name}
                  <button 
                    onClick={() => removeIndicator(ind.id)}
                    className="ml-1 text-red-400 hover:text-red-300"
                    title="حذف اندیکاتور"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
              onClick={() => setShowIndicatorModal(true)}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1 transition-colors"
          >
              <FaChartLine /> Indicators
          </button>
          <div className="text-xs text-gray-400">
            {loading
              ? "Loading..."
              : lastCandle
                ? (<span className={priceColor}>C: {lastCandle.close.toFixed(4)}</span>)
                : "No Data"}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 p-2">
        <div ref={chartContainerRef} className="flex-1 h-full w-full" />
      </div>
    </div>
  );
}

// ***************************************************************
// 8. Main App Component
// ***************************************************************
export default function App() {
    const [showIndicatorModal, setShowIndicatorModal] = useState(false);

    const chartProps = {
        symbol: "BTC/USDT",
        marketType: "Crypto",
        interval: "1D",
        fetchStart: 1672531200,
        fetchEnd: Date.now() / 1000,
        fade: false,
    };

    useEffect(() => {
        if (!window.LightweightCharts) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
            script.onload = () => console.log('Lightweight Charts CDN loaded successfully.');
            document.head.appendChild(script);
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#0b0f14] flex flex-col p-4 font-inter text-white">
            <h1 className="text-3xl font-bold mb-4 text-center text-blue-400">TradingView Mini</h1>

            <div className="flex-1 h-[80vh] relative">
                <ChartToolbar />

                <ChartContainer
                    {...chartProps}
                    setShowIndicatorModal={setShowIndicatorModal}
                />
            </div>

            <IndicatorModal
                isOpen={showIndicatorModal}
                onClose={() => setShowIndicatorModal(false)}
            />

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                html, body, #root {
                    height: 100%;
                    width: 100%;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: 'Inter', sans-serif;
                    background-color: #0b0f14;
                }
                * {
                    border-radius: 0.5rem;
                }
            `}</style>
        </div>
    );
}