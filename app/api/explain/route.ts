import { NextResponse } from "next/server";
import { explainScoreWithGrok } from "@/lib/grok";
import type { ScoringResult } from "@/lib/scoring";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const symbol = typeof body?.symbol === "string" ? body.symbol.trim() : "";
    const score = body?.score as ScoringResult | undefined;

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }

    if (!score || typeof score !== "object") {
      return NextResponse.json({ error: "Missing score object" }, { status: 400 });
    }

    const explanation = await explainScoreWithGrok({ symbol, score });

    return NextResponse.json({ symbol, explanation });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Failed to generate explanation",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
