import { NextResponse } from "next/server";
import { UTCTimestamp } from "lightweight-charts";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "AAPL";

  const API_KEY = process.env.MASSIVE_API_KEY;

  // 🔍 DEBUG: confirm env is loaded
  console.log("API KEY EXISTS:", !!API_KEY);

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Missing API key" },
      { status: 500 }
    );
  }

  try {
    // 📡 Massive endpoint (adjust if your provider differs)
    const url = `https://api.massive.io/v1/ohlc/${symbol}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    const json = await res.json();

    // 🧠 SAFE NORMALIZATION (handles unknown API shapes)
    const raw =
      json?.data?.candles ||
      json?.data?.bars ||
      json?.results?.candles ||
      json?.results ||
      json?.candles;

    if (!Array.isArray(raw)) {
      console.error("Unexpected Massive response:", json);

      return NextResponse.json(
        {
          error: "Invalid API response format",
          debug: json,
        },
        { status: 500 }
      );
    }

    // 📊 Normalize to Lightweight Charts format
    const candles = raw.map((c: any) => ({
      time: Math.floor(c.timestamp / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    return NextResponse.json(candles);
  } catch (err: any) {
    console.error("Fetch failed:", err);

    return NextResponse.json(
      {
        error: "Fetch failed",
        message: err.message,
      },
      { status: 500 }
    );
  }
}