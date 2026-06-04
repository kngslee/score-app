"use client";

import { useState } from "react";
import { ScoringResult } from "@/lib/scoring";

type Props = {
  symbol: string;
  score: ScoringResult;
};

export default function ScorePanel({ symbol, score }: Props) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  async function handleExplain() {
    setIsExplaining(true);
    setExplainError(null);
    setExplanation(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, score }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.message || "Unable to explain score.");
      }

      setExplanation(json.explanation ?? "No explanation returned.");
    } catch (err: unknown) {
      setExplainError(err instanceof Error ? err.message : "Failed to explain score.");
    } finally {
      setIsExplaining(false);
    }
  }

  return (
    <div className="w-full h-full flex flex-col text-white">
      <div className="border-b border-white/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Score Details</h2>
            <p className="text-xs text-slate-400 mt-1">Live breakout analysis</p>
          </div>
          <button
            type="button"
            onClick={handleExplain}
            disabled={isExplaining}
            className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExplaining ? "Explaining..." : "Explain score"}
          </button>
        </div>
        {explainError ? (
          <div className="mt-3 rounded-2xl bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            {explainError}
          </div>
        ) : null}
        {explanation ? (
          <div className="mt-3 rounded-2xl bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200">
            {explanation}
          </div>
        ) : null}
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              Overall Score
            </div>
            <div className="text-3xl font-bold mt-1">{score.overallScore.toFixed(0)}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              Last Price
            </div>
            <div className="text-xl font-semibold mt-1">${score.lastPrice.toFixed(2)}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              Breakout State
            </div>
            <div
              className={`text-xl font-bold mt-1 ${
                score.breakoutState === "ROCKET"
                  ? "text-emerald-400"
                  : score.breakoutState === "STRONG"
                  ? "text-lime-400"
                  : score.breakoutState === "WEAK"
                  ? "text-amber-400"
                  : "text-slate-400"
              }`}
            >
              {score.breakoutState}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              Breakout Probability
            </div>
            <div className="text-xl font-semibold mt-1">
              {score.breakoutProbability.toFixed(1)}%
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              Confidence Tier
            </div>
            <div className="text-xl font-semibold mt-1">
              {score.probabilityTier}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              Institutional Class
            </div>
            <div className="text-xl font-semibold mt-1">
              {score.institutionalClass}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              Market Regime
            </div>
            <div className="text-xl font-semibold mt-1">
              {score.marketRegime}
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              RSI (14)
            </div>
            <div className="text-xl font-semibold mt-1">{score.rsi.toFixed(1)}</div>
          </div>

          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-widest">
              Momentum
            </div>
            <div className="text-xl font-semibold mt-1">
              {score.momentum > 0 ? "+" : ""}{score.momentum.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
