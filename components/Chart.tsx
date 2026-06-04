"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
} from "lightweight-charts";
import type { MarketCandle } from "@/lib/data/market";

function getCurrentTextColor() {
  if (typeof window === "undefined") return "#fff";
  return getComputedStyle(document.documentElement).getPropertyValue("--text")?.trim() || "#fff";
}

const TIMEFRAMES = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "2h", value: "2h" },
  { label: "1d", value: "1d" },
];

type Props = {
  symbol: string;
};

export default function Chart({ symbol }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [timeframe, setTimeframe] = useState<string>("1h");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: getCurrentTextColor(),
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.12)",
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.12)",
        timeVisible: true,
      },
    });

    seriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#f97316",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f97316",
    });

    return () => chartRef.current?.remove();
  }, []);

  useEffect(() => {
    async function loadCandles() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`
        );

        if (!response.ok) {
          throw new Error("Failed to load chart data");
        }

        const json = await response.json();
        const bars = Array.isArray(json.candles) ? json.candles : [];

        const transformed = bars.map((bar: any) => ({
          time: bar.time,
          open: Number(bar.open),
          high: Number(bar.high),
          low: Number(bar.low),
          close: Number(bar.close),
        })) as MarketCandle[];

        seriesRef.current?.setData(transformed);
        chartRef.current?.timeScale().fitContent();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load chart data");
      } finally {
        setLoading(false);
      }
    }

    if (symbol) {
      loadCandles();
    }
  }, [symbol, timeframe]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">{symbol}</h2>
          <p className="text-xs text-slate-400">Candlestick chart</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TIMEFRAMES.map((frame) => (
            <button
              key={frame.value}
              type="button"
              onClick={() => setTimeframe(frame.value)}
              className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition duration-200 ${
                timeframe === frame.value
                  ? "bg-blue-500/20 text-white"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {frame.label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative flex-1 p-4">
        <div ref={chartContainerRef} className="h-full min-h-[380px]" />
        {loading && (
          <div className="absolute inset-x-0 top-20 flex items-start justify-center p-6 text-sm text-slate-400">
            Loading chart data...
          </div>
        )}
        {error && (
          <div className="absolute inset-x-0 top-20 flex items-start justify-center p-6 text-sm text-amber-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
