"use client";

import type { Quote } from "@/lib/data/market";
import type { ScoringResult } from "@/lib/scoring";

type Props = {
  symbol: string;
  quote: Quote | null;
  score: ScoringResult | null;
};

function renderTrend(score: ScoringResult | null): string {
  if (!score) {
    return "Waiting for score data to generate insights.";
  }

  if (score.breakoutState === "ROCKET") {
    return "Momentum is strong and the stock is in a powerful upward trend.";
  }

  if (score.breakoutState === "STRONG") {
    return "The setup looks bullish with positive momentum and breakout pressure building.";
  }

  if (score.breakoutState === "WEAK") {
    return "The stock is showing downward pressure and needs more strength before a reversal.";
  }

  return "Price action is relatively neutral, with no clear breakout signal at the moment.";
}

function renderRisk(score: ScoringResult | null): string {
  if (!score) {
    return "Waiting for score data to generate insights.";
  }

  if (score.rsi > 70) {
    return "RSI is elevated, suggesting the stock may be overextended in the short term.";
  }

  if (score.rsi < 35) {
    return "RSI is low, which may indicate a value or oversold condition depending on broader momentum.";
  }

  return "RSI is balanced, which supports a more disciplined entry if breakout conditions continue.";
}

function renderBreakout(score: ScoringResult | null): string {
  if (!score) {
    return "Waiting for score data to generate insights.";
  }

  if (score.breakoutProbability >= 75) {
    return "This setup has a high breakout probability and could move quickly if price continues above key resistance.";
  }

  if (score.breakoutProbability >= 50) {
    return "The stock has a moderate breakout probability; watch for confirmation from price and volume.";
  }

  return "The breakout probability is lower, so it may be best to wait for a stronger setup before acting.";
}

export default function GrokPanel({ symbol, quote, score }: Props) {
  const trend = renderTrend(score);
  const risk = renderRisk(score);
  const breakout = renderBreakout(score);

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-3xl border border-slate-800/40 bg-slate-900/75 p-4 shadow-xl shadow-slate-950/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Grok Mode</p>
            <h3 className="text-lg font-semibold text-white">AI-style insight</h3>
          </div>
          <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-300">
            {symbol}
          </span>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          <p>{trend}</p>
          <p>{risk}</p>
          <p>{breakout}</p>
          {quote && score ? (
            <p className="text-slate-400">
              Current price ${quote.current.toFixed(2)} with a {score.breakoutProbability.toFixed(0)}% breakout probability.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
