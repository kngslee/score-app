import { NextResponse } from "next/server";
import type { ScoringResult } from "@/lib/scoring";

type RequestBody = {
  symbol: string;
  score: ScoringResult;
  candles?: unknown[];
};

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();

    console.log("ALERT TRIGGERED:", {
      symbol: body.symbol,
      score: body.score.overallScore,
      state: body.score.breakoutState,
    });

    return NextResponse.json({
      ok: true,
      message: "Alert received",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}