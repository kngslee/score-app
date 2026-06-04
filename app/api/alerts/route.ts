import { NextRequest, NextResponse } from "next/server";
import { scoreCandles, ScoringResult } from "@/lib/scoring";
import { evaluateAndCreateAlert, sendDiscordAlert } from "@/lib/alerts";

type CandleInput = {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, candles, benchmarkCandles } = body;

    // Validate inputs
    if (!symbol || !Array.isArray(candles) || candles.length < 5) {
      return NextResponse.json(
        { error: "Invalid request: missing symbol or insufficient candles" },
        { status: 400 }
      );
    }

    // Score the symbol
    const score: ScoringResult = scoreCandles({
      candles,
      benchmarkCandles: benchmarkCandles as CandleInput[] | undefined,
      symbol,
    });

    // Evaluate if alert should be sent
    const alert = evaluateAndCreateAlert(score);

    if (!alert) {
      return NextResponse.json({
        success: true,
        alert: null,
        reason: "No alert triggered - probability or breakout state insufficient",
        score,
      });
    }

    // Send Discord alert
    const sent = await sendDiscordAlert(alert);

    return NextResponse.json({
      success: true,
      alert,
      sent,
      score,
    });
  } catch (err) {
    console.error("Alert trigger failed:", err);

    return NextResponse.json(
      {
        error: "Failed to process alert",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
