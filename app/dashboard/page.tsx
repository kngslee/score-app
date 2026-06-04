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
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [loading, setLoading] = useState<boolean>(true);
  const [discordStatus, setDiscordStatus] = useState<string>("Checking webhook...");

  // Discord webhook status
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

  // Fetch scoring data
  useEffect(() => {
    async function fetchScores() {
      setLoading(true);

      const results: WatchlistItem[] = [];

      for (const symbol of WATCHLIST) {
        try {
          const res = await fetch(`/api/candles?symbol=${symbol}`);
          if (!res.ok) continue;

          const candles = await res.json();
          if (!Array.isArray(candles) || candles.length === 0) continue;

          const score = scoreCandles({ candles, symbol });

          results.push({
            symbol,
            score,
            lastUpdate: Date.now(),
          });

          // Trigger alert logic
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
                }),
              });
            } catch (err) {
              console.error("Alert failed:", err);
            }
          }
        } catch (err) {
          console.error(`Failed ${symbol}:`, err);
        }
      }

      results.sort((a, b) => b.score.overallScore - a.score.overallScore);

      setWatchlist(results);
      setLoading(false);
    }

    fetchScores();

    const interval = setInterval(fetchScores, 300000);

    return () => clearInterval(interval);
  }, []);

  const selected =
    watchlist.find((w) => w.symbol === selectedSymbol) ?? null;

  return (
    <div className="flex h-screen w-screen bg-[#0b0f14] text-white">
      {/* LEFT PANEL */}
      <div className="w-80 border-r border-white/5 flex flex-col">
        <div className="border-b border-white/5 px-6 py-4">
          <h1 className="text-xl font-bold">Swing Terminal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Institutional breakout desk
          </p>

          <div className="mt-3 text-[11px] text-slate-400">
            {discordStatus}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="text-center text-sm text-slate-400 mt-6">
              Loading...
            </div>
          ) : (
            watchlist.map((item) => (
              <button
                key={item.symbol}
                onClick={() => setSelectedSymbol(item.symbol)}
                className={`w-full text-left p-3 rounded-xl transition ${
                  selectedSymbol === item.symbol
                    ? "bg-blue-500/10 border border-blue-500/40"
                    : "bg-white/5 hover:bg-white/10 border border-transparent"
                }`}
              >
                <div className="flex justify-between">
                  <div className="font-semibold">{item.symbol}</div>
                  <div className="text-xs text-slate-400">
                    {item.score.breakoutState}
                  </div>
                </div>

                <div className="flex justify-between text-xs mt-2 text-slate-400">
                  <span>${item.score.lastPrice.toFixed(2)}</span>
                  <span className="text-blue-300">
                    {item.score.overallScore.toFixed(0)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* CENTER */}
      <div className="flex-1">
        <Chart symbol={selectedSymbol} />
      </div>

      {/* RIGHT */}
      <div className="w-80 border-l border-white/5 bg-[#0f1419]">
        {selected ? (
          <ScorePanel score={selected.score} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Select a symbol
          </div>
        )}
      </div>
    </div>
  );
}