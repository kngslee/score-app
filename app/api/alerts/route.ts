import { NextResponse } from "next/server";
import { scoreCandles, type ScoringResult } from "@/lib/scoring";
import { evaluateAndCreateAlert, sendDiscordAlert } from "@/lib/alerts";

type CandleInput = {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, candles } = body;

    if (!symbol || !Array.isArray(candles) || candles.length < 5) {
      return NextResponse.json(
        { error: "Missing symbol or insufficient candles" },
        { status: 400 }
      );
    }

    const score: ScoringResult = scoreCandles({
      candles: candles as CandleInput[],
      symbol,
    });

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
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to process alert",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}