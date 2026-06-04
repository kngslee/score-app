import { NextResponse } from "next/server";
import { scoreCandles } from "@/lib/scoring";

export async function POST(req: Request) {
  try {
    const { symbol, candles } = await req.json();

    const result = scoreCandles({
      symbol,
      candles,
    });

    return NextResponse.json({ symbol, result });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}