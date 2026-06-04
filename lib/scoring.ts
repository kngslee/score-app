export type ScoringResult = {
  overallScore: number;
  lastPrice: number;

  breakoutState: "ROCKET" | "STRONG" | "WEAK" | "NEUTRAL";
  breakoutProbability: number;

  probabilityTier: "LOW" | "MID" | "HIGH";
  institutionalClass: "A" | "B" | "C" | "D";

  marketRegime: "BULL" | "BEAR" | "SIDEWAYS";

  rsi: number;

  momentum: number;
};

type Candle = {
  close: number;
};

function calculateRSI(closes: number[]): number {
  if (closes.length < 2) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / closes.length;
  const avgLoss = losses / closes.length;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function scoreCandles({
  candles,
}: {
  candles: Candle[];
}): ScoringResult {
  const closes = candles.map(c => c.close);

  const lastPrice = closes[closes.length - 1] ?? 0;

  const avg = closes.reduce((a, b) => a + b, 0) / closes.length || 0;

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
    momentum > 3 ? "BULL" : momentum < -3 ? "BEAR" : "SIDEWAYS";

  const rsi = calculateRSI(closes);

  return {
    overallScore: Math.min(100, Math.abs(momentum) * 10),
    lastPrice,

    breakoutState,
    breakoutProbability,

    probabilityTier,
    institutionalClass,
    marketRegime,

    rsi,

    momentum, // ✅ THIS FIXES YOUR ERROR
  };
}