import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/data/market";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchSymbols(query);
    return NextResponse.json({ results });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
