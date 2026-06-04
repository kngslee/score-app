import { NextResponse } from "next/server";
import type { ScoringResult } from "@/lib/scoring";
import { scoreCandles } from "@/lib/scoring";

type RequestBody = {
  symbol: string;
  candles: { close: number }[];
};

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();

    if (!body.candles || body.candles.length === 0) {
      return NextResponse.json(
        { error: "No candles provided" },
        { status: 400 }
      );
    }

    const result: ScoringResult = scoreCandles({
      candles: body.candles,
      symbol: body.symbol,
    });

    return NextResponse.json({
      symbol: body.symbol,
      result,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}