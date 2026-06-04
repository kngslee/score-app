"use client";

import { useEffect, useState } from "react";
import Chart from "./Chart";
import ScorePanel from "./ScorePanel";
import ThemeToggle from "./ThemeToggle";
import { type ScoringResult } from "@/lib/scoring";

const WATCHLIST = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "META",
  "AMZN",
  "GOOGL",
  "AMD",
];

type WatchlistItem = {
  symbol: string;
  score: ScoringResult;
  lastUpdate: number;
};

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(WATCHLIST[0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [discordStatus, setDiscordStatus] = useState<string>("Checking webhook...");

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/alerts/status");
        const data = await res.json();
        setDiscordStatus(
          data?.webhookConfigured
            ? "Discord webhook connected"
            : "Discord webhook missing"
        );
      } catch {
        setDiscordStatus("Discord webhook unavailable");
      }
    }

    loadStatus();
  }, []);

  useEffect(() => {
    async function loadWatchlist() {
      setLoading(true);
      const results: WatchlistItem[] = [];

      for (const symbol of WATCHLIST) {
        try {
          const res = await fetch(`/api/score?symbol=${symbol}`);
          if (!res.ok) continue;

          const data = await res.json();
          const score = data?.score as ScoringResult | undefined;
          if (!score) continue;

          results.push({
            symbol,
            score,
            lastUpdate: Date.now(),
          });

          if (
            (score.breakoutState === "ROCKET" && score.breakoutProbability >= 75) ||
            (score.breakoutState === "STRONG" && score.breakoutProbability >= 65)
          ) {
            try {
              await fetch("/api/alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol }),
              });
            } catch (err) {
              console.error(`Failed to send alert for ${symbol}:`, err);
            }
          }
        } catch (err) {
          console.error(`Failed to load score for ${symbol}:`, err);
        }
      }

      results.sort((a, b) => b.score.overallScore - a.score.overallScore);
      setWatchlist(results);
      setLoading(false);
    }

    loadWatchlist();
    const interval = setInterval(loadWatchlist, 300000);
    return () => clearInterval(interval);
  }, []);

  const selectedItem =
    watchlist.find((item) => item.symbol === selectedSymbol) ?? watchlist[0] ?? null;

  return (
    <div className="flex min-h-screen w-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="w-80 overflow-hidden border-r border-white/10 glass-panel flex flex-col">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Swing Terminal</h1>
              <p className="text-xs text-slate-500 mt-1">Institutional breakout desk</p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                {discordStatus}
              </div>
            </div>
          </div>
        </div>

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

      <div className="flex-1 flex flex-col overflow-hidden border-r border-white/10 glass-panel">
        <Chart symbol={selectedItem?.symbol ?? WATCHLIST[0]} />
      </div>

      <div className="w-80 overflow-hidden border-l border-white/10 glass-panel">
        {selectedItem ? (
          <ScorePanel score={selectedItem.score} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <p className="text-sm">Select a symbol to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
