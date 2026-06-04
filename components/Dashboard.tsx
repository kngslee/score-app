"use client";

import { useEffect, useMemo, useState } from "react";
import Chart from "./Chart";
import GrokPanel from "./GrokPanel";
import ScorePanel from "./ScorePanel";
import SymbolSearch from "./SymbolSearch";
import ThemeToggle from "./ThemeToggle";
import { type ScoringResult } from "@/lib/scoring";
import { addSymbol, getWatchlist, removeSymbol } from "@/lib/watchlist";
import type { Quote } from "@/lib/data/market";

type WatchlistItem = {
  symbol: string;
  quote?: Quote;
  lastUpdated?: number;
};

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  const [selectedScore, setSelectedScore] = useState<ScoringResult | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [alertLoading, setAlertLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);

  const symbols = useMemo(() => watchlist.map((item) => item.symbol), [watchlist]);

  useEffect(() => {
    const saved = getWatchlist();
    setWatchlist(saved.map((symbol) => ({ symbol })));
    setSelectedSymbol(saved[0] || "AAPL");
  }, []);

  useEffect(() => {
    async function refreshQuotes(symbolsToFetch: string[]) {
      if (symbolsToFetch.length === 0) return;
      setLoadingList(true);
      setWatchlistError(null);

      try {
        const response = await fetch(
          `/api/quotes?symbols=${symbolsToFetch.join(",")}`
        );
        if (!response.ok) {
          throw new Error("Unable to load watchlist quotes.");
        }

        const json = await response.json();
        const quotes = json.quotes ?? {};
        setWatchlist((current) =>
          symbolListFrom(current, quotes)
        );
      } catch (error: unknown) {
        setWatchlistError(
          error instanceof Error ? error.message : "Failed to refresh watchlist"
        );
      } finally {
        setLoadingList(false);
      }
    }

    refreshQuotes(symbols);
    const interval = window.setInterval(() => refreshQuotes(symbols), 30_000);
    return () => window.clearInterval(interval);
  }, [symbols]);

  useEffect(() => {
    async function refreshSelected() {
      if (!selectedSymbol) return;
      setSelectedScore(null);

      try {
        const [scoreResponse, quoteResponse] = await Promise.all([
          fetch(`/api/score?symbol=${encodeURIComponent(selectedSymbol)}`),
          fetch(`/api/quote?symbol=${encodeURIComponent(selectedSymbol)}`),
        ]);

        if (!scoreResponse.ok) {
          throw new Error("Unable to load score.");
        }

        if (!quoteResponse.ok) {
          throw new Error("Unable to load quote.");
        }

        const scoreJson = await scoreResponse.json();
        const quoteJson = await quoteResponse.json();

        setSelectedScore(scoreJson.score);
        setSelectedQuote(quoteJson.quote);
      } catch (error: unknown) {
        console.error(error);
      }
    }

    refreshSelected();
  }, [selectedSymbol]);

  function symbolListFrom(
    current: WatchlistItem[],
    quotes: Record<string, Quote>
  ) {
    return current.map((item) => ({
      symbol: item.symbol,
      quote: quotes[item.symbol] ?? item.quote,
      lastUpdated: Date.now(),
    }));
  }

  async function handleAddSymbol(symbol: string) {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized || watchlist.some((item) => item.symbol === normalized)) {
      return;
    }

    const nextSymbols = addSymbol(normalized);
    setWatchlist(nextSymbols.map((symbol) => ({ symbol })));
    setSelectedSymbol(normalized);
  }

  async function handleSendAlert() {
    if (!selectedSymbol) return;

    setAlertLoading(true);
    setAlertMessage(null);

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selectedSymbol }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to send alert");
      }

      if (data.sent) {
        setAlertMessage(
          data.alert
            ? `Alert sent for ${selectedSymbol}: ${data.alert.title}`
            : `No alert triggered for ${selectedSymbol}.`
        );
      } else {
        setAlertMessage(
          data.reason || "Alert evaluated, but no Discord webhook was configured or alert was not sent."
        );
      }
    } catch (error: unknown) {
      setAlertMessage(
        error instanceof Error ? error.message : "Failed to send alert."
      );
    } finally {
      setAlertLoading(false);
    }
  }

  function handleRemoveSymbol(symbol: string) {
    const nextSymbols = removeSymbol(symbol);
    setWatchlist(nextSymbols.map((symbol) => ({ symbol })));
    if (selectedSymbol === symbol) {
      setSelectedSymbol(nextSymbols[0]);
    }
  }

  return (
    <div className="flex min-h-screen w-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="w-80 overflow-hidden border-r border-white/10 glass-panel flex flex-col">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Swing Terminal</h1>
              <p className="text-xs text-slate-400 mt-1">Watchlist & breakout scanner</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="mt-4 space-y-2">
            <SymbolSearch onSelect={handleAddSymbol} />
            {watchlistError ? (
              <div className="text-xs text-rose-300">{watchlistError}</div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {watchlist.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">No symbols in watchlist.</div>
          ) : (
            <div className="space-y-2">
              {watchlist.map((item) => {
                const change = item.quote ? item.quote.current - item.quote.prevClose : 0;
                const positive = change >= 0;
                return (
                  <div
                    key={item.symbol}
                    className={`rounded-3xl border px-4 py-4 transition ${
                      selectedSymbol === item.symbol
                        ? "border-blue-400/30 bg-blue-500/5 shadow-[0_14px_40px_-25px_rgba(56,189,248,0.45)]"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSymbol(item.symbol)}
                        className="text-left"
                      >
                        <div className="text-base font-semibold text-white">{item.symbol}</div>
                        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                          {item.quote ? item.quote.symbol : "Loading"}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSymbol(item.symbol)}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-300">
                      <div>${item.quote ? item.quote.current.toFixed(2) : "-"}</div>
                      <div className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${
                        positive ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
                      }`}>
                        {item.quote ? `${positive ? "+" : ""}${change.toFixed(2)}` : "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden border-r border-white/10 glass-panel">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm text-slate-400">Selected Symbol</div>
              <div className="text-2xl font-semibold">{selectedSymbol}</div>
              {selectedQuote && (
                <div className="text-xs text-slate-500 mt-1">
                  ${selectedQuote.current.toFixed(2)} · Open ${selectedQuote.open.toFixed(2)} · High ${selectedQuote.high.toFixed(2)} · Low ${selectedQuote.low.toFixed(2)}
                </div>
              )}
              {alertMessage ? (
                <div className="mt-3 text-xs text-emerald-300">{alertMessage}</div>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <button
                type="button"
                onClick={handleSendAlert}
                disabled={alertLoading}
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {alertLoading ? "Checking alerts..." : "Trigger alert"}
              </button>
              <div className="rounded-3xl bg-white/5 px-4 py-3 text-sm text-slate-300">
                {loadingList ? "Refreshing quotes..." : "Live watchlist data"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Chart symbol={selectedSymbol} />
        </div>
      </div>

      <div className="w-96 overflow-hidden border-l border-white/10 glass-panel">
        <div className="flex h-full flex-col overflow-y-auto">
          {selectedScore ? (
            <ScorePanel symbol={selectedSymbol} score={selectedScore} />
          ) : (
            <div className="h-full flex items-center justify-center p-6 text-slate-400">
              Loading score analysis...
            </div>
          )}
          <div className="border-t border-white/10 p-4">
            <GrokPanel symbol={selectedSymbol} quote={selectedQuote} score={selectedScore} />
          </div>
        </div>
      </div>
    </div>
  );
}
