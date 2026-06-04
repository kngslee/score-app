"use client";

import { ScoringResult } from "@/lib/scoring";

type Props = {
  score: ScoringResult;
};

export default function ScorePanel({ score }: Props) {
  return (
    <div className="w-full h-full flex flex-col text-white">
      <div className="border-b border-white/5 p-4">
        <h2 className="text-lg font-bold tracking-tight">Score Details</h2>
        <p className="text-xs text-slate-400 mt-1">Live breakout analysis</p>
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
