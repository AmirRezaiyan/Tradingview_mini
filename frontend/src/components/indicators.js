// frontend/src/components/indicators.js

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(candles, period = 20) {
  if (!candles || candles.length < period) {
    console.warn("Not enough candles for SMA calculation");
    return [];
  }

  const result = [];
  
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    const sma = sum / period;
    result.push({
      time: candles[i].time,
      value: sma,
    });
  }
  
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(candles, period = 20) {
  if (!candles || candles.length < period) {
    console.warn("Not enough candles for EMA calculation");
    return [];
  }

  const result = [];
  const multiplier = 2 / (period + 1);
  
  // محاسبه اولین SMA به عنوان EMA اول
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let ema = sum / period;
  
  result.push({
    time: candles[period - 1].time,
    value: ema,
  });
  
  // محاسبه EMA برای بقیه کندل‌ها
  for (let i = period; i < candles.length; i++) {
    ema = (candles[i].close - ema) * multiplier + ema;
    result.push({
      time: candles[i].time,
      value: ema,
    });
  }
  
  return result;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(candles, period = 14) {
  if (!candles || candles.length < period + 1) {
    console.warn("Not enough candles for RSI calculation");
    return [];
  }

  const result = [];
  let gains = 0;
  let losses = 0;
  
  // محاسبه میانگین اولیه
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // محاسبه RSI اولیه
  let rs = avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  
  result.push({
    time: candles[period].time,
    value: rsi,
  });
  
  // محاسبه RSI برای بقیه کندل‌ها
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    
    rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
    
    result.push({
      time: candles[i].time,
      value: rsi,
    });
  }
  
  return result;
}

/**
 * Calculate Moving Average Convergence Divergence (MACD)
 */
export function calculateMACD(candles, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!candles || candles.length < slowPeriod + signalPeriod) {
    console.warn("Not enough candles for MACD calculation");
    return [];
  }

  // محاسبه EMA سریع و کند
  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);
  
  // محاسبه MACD Line
  const macdLine = [];
  const startIndex = slowPeriod - fastPeriod;
  
  for (let i = 0; i < slowEMA.length; i++) {
    const fastValue = fastEMA[i + startIndex]?.value;
    const slowValue = slowEMA[i]?.value;
    
    if (fastValue && slowValue) {
      macdLine.push({
        time: slowEMA[i].time,
        value: fastValue - slowValue,
      });
    }
  }
  
  // محاسبه Signal Line (EMA از MACD Line)
  const signalLine = [];
  const multiplier = 2 / (signalPeriod + 1);
  
  if (macdLine.length >= signalPeriod) {
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) {
      sum += macdLine[i].value;
    }
    let signal = sum / signalPeriod;
    
    signalLine.push({
      time: macdLine[signalPeriod - 1].time,
      value: signal,
    });
    
    for (let i = signalPeriod; i < macdLine.length; i++) {
      signal = (macdLine[i].value - signal) * multiplier + signal;
      signalLine.push({
        time: macdLine[i].time,
        value: signal,
      });
    }
  }
  
  // محاسبه Histogram
  const histogram = [];
  for (let i = signalPeriod - 1; i < macdLine.length; i++) {
    const signalIndex = i - (signalPeriod - 1);
    histogram.push({
      time: macdLine[i].time,
      value: macdLine[i].value - signalLine[signalIndex].value,
    });
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram,
  };
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(candles, period = 20, stdDev = 2) {
  if (!candles || candles.length < period) {
    console.warn("Not enough candles for Bollinger Bands calculation");
    return { upper: [], middle: [], lower: [] };
  }

  const sma = calculateSMA(candles, period);
  const upper = [];
  const middle = [];
  const lower = [];
  
  for (let i = period - 1; i < candles.length; i++) {
    const smaValue = sma[i - (period - 1)].value;
    
    // محاسبه انحراف معیار
    let sumSquaredDiff = 0;
    for (let j = 0; j < period; j++) {
      const diff = candles[i - j].close - smaValue;
      sumSquaredDiff += diff * diff;
    }
    const standardDeviation = Math.sqrt(sumSquaredDiff / period);
    
    const time = candles[i].time;
    
    upper.push({
      time: time,
      value: smaValue + (stdDev * standardDeviation),
    });
    
    middle.push({
      time: time,
      value: smaValue,
    });
    
    lower.push({
      time: time,
      value: smaValue - (stdDev * standardDeviation),
    });
  }
  
  return { upper, middle, lower };
}

/**
 * Calculate Volume Weighted Average Price (VWAP)
 * Note: Requires volume data
 */
export function calculateVWAP(candles) {
  if (!candles || candles.length === 0) {
    console.warn("No candles for VWAP calculation");
    return [];
  }

  const result = [];
  let cumulativePV = 0;
  let cumulativeVolume = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const typical = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const volume = candles[i].volume || 1; // استفاده از حجم 1 اگر موجود نبود
    
    cumulativePV += typical * volume;
    cumulativeVolume += volume;
    
    const vwap = cumulativePV / cumulativeVolume;
    
    result.push({
      time: candles[i].time,
      value: vwap,
    });
  }
  
  return result;
}

/**
 * Calculate Stochastic Oscillator
 */
export function calculateStochastic(candles, kPeriod = 14, dPeriod = 3) {
  if (!candles || candles.length < kPeriod) {
    console.warn("Not enough candles for Stochastic calculation");
    return { k: [], d: [] };
  }

  const kLine = [];
  
  // محاسبه %K
  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    
    for (let j = 0; j < kPeriod; j++) {
      highest = Math.max(highest, candles[i - j].high);
      lowest = Math.min(lowest, candles[i - j].low);
    }
    
    const current = candles[i].close;
    const k = ((current - lowest) / (highest - lowest)) * 100;
    
    kLine.push({
      time: candles[i].time,
      value: k,
    });
  }
  
  // محاسبه %D (SMA از %K)
  const dLine = [];
  
  for (let i = dPeriod - 1; i < kLine.length; i++) {
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += kLine[i - j].value;
    }
    const d = sum / dPeriod;
    
    dLine.push({
      time: kLine[i].time,
      value: d,
    });
  }
  
  return { k: kLine, d: dLine };
}