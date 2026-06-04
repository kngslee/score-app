import { NextResponse } from "next/server";
import { explainScore, type ScoringResult } from "@/lib/scoring";

type RequestBody = {
  score: ScoringResult;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.score) {
      return NextResponse.json({ error: "Missing score payload" }, { status: 400 });
    }

    const explanation = explainScore(body.score);
    return NextResponse.json({ explanation });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to explain score",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
