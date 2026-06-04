export type ScoringResult = {
  overallScore: number;
  lastPrice: number;

  breakoutState: "ROCKET" | "STRONG" | "WEAK" | "NEUTRAL";
  breakoutProbability: number;

  probabilityTier: "LOW" | "MID" | "HIGH";
  institutionalClass: "A" | "B" | "C" | "D";

  marketRegime: "BULL" | "BEAR" | "SIDEWAYS";
};

type Candle = {
  close: number;
};

export function scoreCandles({
  candles,
}: {
  candles: Candle[];
  symbol: string;
}): ScoringResult {
  const lastPrice = candles[candles.length - 1]?.close ?? 0;

  const avg =
    candles.reduce((a, b) => a + b.close, 0) / candles.length || 0;

  const momentum = avg ? ((lastPrice - avg) / avg) * 100 : 0;

  const breakoutProbability = Math.min(100, Math.abs(momentum) * 5);

  const breakoutState: ScoringResult["breakoutState"] =
    momentum > 5
      ? "ROCKET"
      : momentum > 2
      ? "STRONG"
      : momentum < -5
      ? "WEAK"
      : "NEUTRAL";

  const probabilityTier: ScoringResult["probabilityTier"] =
    breakoutProbability > 70
      ? "HIGH"
      : breakoutProbability > 40
      ? "MID"
      : "LOW";

  const institutionalClass: ScoringResult["institutionalClass"] =
    breakoutProbability > 80
      ? "A"
      : breakoutProbability > 60
      ? "B"
      : breakoutProbability > 40
      ? "C"
      : "D";

  const marketRegime: ScoringResult["marketRegime"] =
    momentum > 3
      ? "BULL"
      : momentum < -3
      ? "BEAR"
      : "SIDEWAYS";

  return {
    overallScore: Math.min(100, Math.abs(momentum) * 10),
    lastPrice,

    breakoutState,
    breakoutProbability,

    probabilityTier,
    institutionalClass,

    marketRegime,
  };
}