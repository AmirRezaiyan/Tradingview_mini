// frontend/src/pages/TestPage.jsx
// این فایل رو می‌تونی برای تست استفاده کنی
import React from "react";
import ChartContainer from "../components/ChartContainer";

export default function TestPage() {
  return (
    <div className="w-screen h-screen bg-[#0b0f14] p-4">
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="bg-[#151921] rounded-lg p-4 border border-gray-800">
          <h1 className="text-2xl font-bold text-white mb-2">
            📊 TradingView Mini - Test Page
          </h1>
          <div className="text-sm text-gray-400 space-y-1">
            <p>✅ چیزهایی که باید کار کنه:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>دکمه‌های toolbar در بالا سمت چپ (Trendline, Fibonacci, ...)</li>
              <li>دکمه "+ Indicators" در بالا سمت راست</li>
              <li>وقتی روی هر ابزار کلیک کنی، باید بتونی روی چارت بکشی</li>
              <li>وقتی "+ Indicators" رو بزنی باید مودال باز بشه و لیست اندیکاتورها رو ببینی</li>
            </ul>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer 
          symbol="BTCUSDT" 
          marketType="crypto" 
          interval="1h" 
        />
      </div>

      {/* Debug Panel */}
      <div className="fixed bottom-4 right-4 bg-[#151921] rounded-lg p-3 border border-gray-800 max-w-md">
        <div className="text-xs text-gray-400 space-y-1">
          <p className="font-bold text-white mb-2">🐛 Debug Info:</p>
          <p>اگر مشکلی هست، کنسول براوزر رو باز کن (F12)</p>
          <p>باید لاگ‌هایی مثل اینا ببینی:</p>
          <ul className="list-disc list-inside ml-2 mt-2 space-y-1">
            <li>🔧 Tool selected: trendline</li>
            <li>🖱️ Mouse down at ...</li>
            <li>📊 Indicator selected: ...</li>
            <li>✅ Events dispatched: ...</li>
          </ul>
        </div>
      </div>
    </div>
  );
}