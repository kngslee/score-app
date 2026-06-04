export type ScoringResult = {
  overallScore: number;
  lastPrice: number;
  breakoutState: "ROCKET" | "STRONG" | "WEAK" | "NEUTRAL";
  breakoutProbability: number;
  probabilityTier: "LOW" | "MID" | "HIGH";
};

type Candle = {
  close: number;
};

type ScoreInput = {
  candles: Candle[];
  symbol: string;
};

export function scoreCandles({ candles }: ScoreInput): ScoringResult {
  const lastPrice = candles[candles.length - 1]?.close ?? 0;

  const avg =
    candles.reduce((sum, c) => sum + c.close, 0) / candles.length || 0;

  const momentum = ((lastPrice - avg) / avg) * 100;

  let breakoutState: ScoringResult["breakoutState"] = "NEUTRAL";
  let breakoutProbability = Math.min(100, Math.abs(momentum) * 5);

  if (momentum > 5) breakoutState = "ROCKET";
  else if (momentum > 2) breakoutState = "STRONG";
  else if (momentum < -5) breakoutState = "WEAK";

  const probabilityTier =
    breakoutProbability > 70
      ? "HIGH"
      : breakoutProbability > 40
      ? "MID"
      : "LOW";

  return {
    overallScore: Math.min(100, Math.abs(momentum) * 10),
    lastPrice,
    breakoutState,
    breakoutProbability,
    probabilityTier,
  };
}