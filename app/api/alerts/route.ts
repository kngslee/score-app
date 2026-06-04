import { NextResponse } from "next/server";
import { fetchMarketCandles } from "@/lib/market";
import { scoreCandles, type ScoringResult } from "@/lib/scoring";
import { evaluateAndCreateAlert, sendDiscordAlert } from "@/lib/alerts";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const symbol = body?.symbol;

    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json(
        { error: "Missing symbol" },
        { status: 400 }
      );
    }

    const candles = await fetchMarketCandles(symbol);
    const score: ScoringResult = scoreCandles({ candles });
    const alert = evaluateAndCreateAlert(symbol, score);

    if (!alert) {
      return NextResponse.json({
        success: true,
        alert: null,
        reason: "Probability or breakout state insufficient",
      });
    }

    const sent = await sendDiscordAlert(alert);

    return NextResponse.json({
      success: true,
      alert,
      sent,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Failed to process alert",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
