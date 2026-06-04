"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchResult } from "@/lib/data/market";
import { DEFAULT_WATCHLIST } from "@/lib/symbols";

type Props = {
  onSelect: (symbol: string) => void;
};

export default function SymbolSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("Unable to search symbols");
        }

        const json = await res.json();
        setResults(Array.isArray(json.results) ? json.results : []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Search failed. Try a different ticker.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const list = useMemo(() => {
    if (!query.trim() || results.length === 0) return [];
    return results.slice(0, 8);
  }, [query, results]);

  const suggestions = useMemo(() => {
    if (query.trim().length >= 2) return list;
    return DEFAULT_WATCHLIST.slice(0, 8).map((symbol) => ({
      symbol,
      description: "Popular S&P 500 ticker",
    }));
  }, [query, list]);

  const displayList = query.trim().length >= 2 ? list : suggestions;

  return (
    <div className="relative w-full">
      <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-400 mb-2">
        Add symbol
      </label>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search ticker, company name"
        className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/15"
      />
      {loading && (
        <div className="mt-2 text-xs text-slate-400">Searching...</div>
      )}
      {error && (
        <div className="mt-2 text-xs text-amber-300">{error}</div>
      )}
      {displayList.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-3xl border border-white/10 bg-[#090c15]/95 shadow-xl backdrop-blur-xl">
          {displayList.map((result) => (
            <button
              key={result.symbol}
              type="button"
              onClick={() => {
                onSelect(result.symbol);
                setQuery("");
                setResults([]);
              }}
              className="flex w-full flex-col gap-1 px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
            >
              <span className="font-semibold">{result.symbol}</span>
              <span className="text-xs text-slate-400">{result.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
