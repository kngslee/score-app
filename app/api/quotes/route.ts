import { NextResponse } from "next/server";
import { fetchBatchQuotes } from "@/lib/data/market";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols")?.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean);

  if (!symbols || symbols.length === 0) {
    return NextResponse.json({ error: "Missing symbols parameter" }, { status: 400 });
  }

  try {
    const quotes = await fetchBatchQuotes(symbols);
    return NextResponse.json({ quotes });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to load quotes",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
