import { NextResponse } from "next/server";
import { fetchQuote } from "@/lib/data/market";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.trim();

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
  }

  try {
    const quote = await fetchQuote(symbol);
    return NextResponse.json({ quote });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to load quote",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
