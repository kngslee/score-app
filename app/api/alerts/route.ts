import { NextResponse } from "next/server";
import type { ScoringResult } from "@/lib/scoring";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    return NextResponse.json({
      ok: true,
      received: body.symbol ?? "unknown",
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}