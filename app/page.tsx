"use client";

import { useEffect, useState } from "react";
import Chart from "@/components/Chart";
import ScorePanel from "@/components/ScorePanel";
import { scoreCandles, type ScoringResult } from "@/lib/scoring";

const WATCHLIST = ["AAPL", "MSFT", "NVDA", "TSLA", "META", "AMZN", "GOOGL", "AMD"];

type WatchlistItem = {
  symbol: string;
  score: ScoringResult;
  lastUpdate: number;
};

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [loading, setLoading] = useState(true);
  const [discordStatus, setDiscordStatus] = useState("Checking webhook...");

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/alerts/status");
        const data = await res.json();
        setDiscordStatus(data.webhookConfigured ? "Discord webhook connected" : "Discord webhook missing");
      } catch {
        setDiscordStatus("Discord webhook unavailable");
      }
    }

    loadStatus();
  }, []);

  // Fetch scores for all watchlist items
  useEffect(() => {
    async function fetchScores() {
      setLoading(true);
      const results: WatchlistItem[] = [];

      for (const symbol of WATCHLIST) {
        try {
          // Fetch candles from API
          const res = await fetch(`/api/candles?symbol=${symbol}`);
          if (!res.ok) continue;

          const candles = await res.json();
          if (!Array.isArray(candles) || candles.length === 0) continue;

          // Score the candles
          const score = scoreCandles({ candles, symbol });
          results.push({
            symbol,
            score,
            lastUpdate: Date.now(),
          });

          // Trigger alert if high probability
          if (
            (score.breakoutState === "ROCKET" && score.breakoutProbability >= 75) ||
            (score.breakoutState === "STRONG" && score.breakoutProbability >= 65)
          ) {
            try {
              await fetch(`/api/alerts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  symbol,
                  candles,
                  benchmarkCandles: undefined,
                }),
              });
            } catch (err) {
              console.error(`Failed to send alert for ${symbol}:`, err);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch ${symbol}:`, err);
        }
      }

      // Sort by overall score descending
      results.sort((a, b) => b.score.overallScore - a.score.overallScore);
      setWatchlist(results);
      setLoading(false);
    }

    fetchScores();
    const interval = setInterval(fetchScores, 300000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#0b0f14] text-white">
      {/* Left Panel: Watchlist */}
      <div className="w-80 overflow-hidden border-r border-white/5 flex flex-col">
        <div className="border-b border-white/5 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Swing Terminal</h1>
              <p className="text-xs text-slate-500 mt-1">Institutional breakout desk</p>
            </div>
            <div className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
              {discordStatus}
            </div>
          </div>
        </div>

        {/* Watchlist Scroll */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">
              Loading watchlist...
            </div>
          ) : watchlist.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">
              No data available
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {watchlist.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => setSelectedSymbol(item.symbol)}
                  className={`w-full rounded-3xl border px-4 py-4 text-left text-sm font-medium transition-all duration-200 ${
                    selectedSymbol === item.symbol
                      ? "border-blue-500/60 bg-blue-500/5 shadow-[0_10px_30px_-20px_rgba(56,189,248,0.45)]"
                      : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <div className="text-base font-semibold text-white">{item.symbol}</div>
                      <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                        {item.score.probabilityTier}
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                        item.score.breakoutState === "ROCKET"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : item.score.breakoutState === "STRONG"
                          ? "bg-lime-500/10 text-lime-300"
                          : item.score.breakoutState === "WEAK"
                          ? "bg-amber-500/10 text-amber-300"
                          : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {item.score.breakoutState}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span>${item.score.lastPrice.toFixed(2)}</span>
                    <span className="text-blue-300 font-semibold">
                      {item.score.overallScore.toFixed(0)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center Panel: Chart */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
        <Chart symbol={selectedSymbol} />
      </div>

      {/* Right Panel: Score Details */}
      <div className="w-80 overflow-hidden border-l border-white/5 flex flex-col bg-[#0f1419]">
        {watchlist.length > 0 && watchlist.find((w) => w.symbol === selectedSymbol) ? (
          <ScorePanel score={watchlist.find((w) => w.symbol === selectedSymbol)!.score} />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p className="text-sm">Select a symbol to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
