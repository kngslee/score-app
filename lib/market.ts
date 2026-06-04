import { UTCTimestamp } from "lightweight-charts";

export type MarketCandle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};

export async function fetchMarketCandles(symbol: string): Promise<MarketCandle[]> {
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing MASSIVE_API_KEY");
  }

  const url = `https://api.massive.io/v1/ohlc/${symbol}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Market data request failed with status ${res.status}`);
  }

  const json = await res.json();
  const rawCandles =
    json?.data?.candles ||
    json?.data?.bars ||
    json?.results?.candles ||
    json?.results ||
    json?.candles;

  if (!Array.isArray(rawCandles)) {
    throw new Error("Invalid market data response format");
  }

  return rawCandles.map((c: any) => ({
    time: Math.floor(Number(c.timestamp) / 1000) as UTCTimestamp,
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
  }));
}
