import { NextResponse } from "next/server";
import { fetchCandles } from "@/lib/data/market";
import { scoreCandles, type ScoringResult } from "@/lib/scoring";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.trim();
  const timeframe = searchParams.get("timeframe") || "1d";

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
  }

  try {
    const candles = await fetchCandles(symbol, timeframe);
    const score: ScoringResult = scoreCandles({ candles });

    return NextResponse.json({ symbol, score, timeframe });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Failed to generate score",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
