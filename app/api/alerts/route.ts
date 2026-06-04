import { NextResponse } from "next/server";
import type { ScoringResult } from "@/lib/scoring";

type RequestBody = {
  score: ScoringResult;
  symbol?: string;
};

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();

    // TEMP: just log for now (no explainScore needed)
    console.log("Alert received:", body.symbol, body.score);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}