import { UTCTimestamp } from "lightweight-charts";

export type MarketCandle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type Quote = {
  symbol: string;
  current: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  timestamp: number;
};

export type SearchResult = {
  symbol: string;
  description: string;
  exchange?: string;
  type?: string;
};

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const ALPHAVANTAGE_API_KEY = process.env.ALPHAVANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHAVANTAGE_API_KEY;

const quoteCache = new Map<string, { expires: number; quote: Quote }>();
const candleCache = new Map<string, { expires: number; candles: MarketCandle[] }>();
const searchCache = new Map<string, { expires: number; results: SearchResult[] }>();

const DEFAULT_QUOTE_TTL = 35_000;
const DEFAULT_CANDLE_TTL = 180_000;
const DEFAULT_SEARCH_TTL = 60_000;

const VALID_TIMEFRAMES = new Set(["1m", "5m", "15m", "30m", "60m", "120m", "1h", "2h", "1d"]);

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function getProviderName() {
  if (FINNHUB_API_KEY) return "finnhub";
  if (ALPHAVANTAGE_API_KEY) return "alphavantage";
  throw new Error("Missing market data provider configuration. Set FINNHUB_API_KEY or ALPHAVANTAGE_API_KEY.");
}

function getFinnhubResolution(timeframe: string) {
  switch (timeframe) {
    case "1m":
      return "1";
    case "5m":
      return "5";
    case "15m":
      return "15";
    case "30m":
      return "30";
    case "60m":
    case "1h":
      return "60";
    case "120m":
    case "2h":
      return "120";
    case "1d":
      return "D";
    default:
      return "D";
  }
}

function getAlphaVantageInterval(timeframe: string) {
  switch (timeframe) {
    case "1m":
      return "1min";
    case "5m":
      return "5min";
    case "15m":
      return "15min";
    case "30m":
      return "30min";
    case "60m":
    case "1h":
      return "60min";
    default:
      return "daily";
  }
}

function getAlphaVantageFunction(timeframe: string) {
  const interval = getAlphaVantageInterval(timeframe);
  if (interval === "daily") return "TIME_SERIES_DAILY_ADJUSTED";
  return "TIME_SERIES_INTRADAY";
}

function getWindowSeconds(timeframe: string) {
  switch (timeframe) {
    case "1m":
    case "5m":
    case "15m":
    case "30m":
      return 60 * 60 * 24 * 4;
    case "60m":
    case "1h":
      return 60 * 60 * 24 * 7;
    case "120m":
    case "2h":
      return 60 * 60 * 24 * 14;
    case "1d":
      return 60 * 60 * 24 * 120;
    default:
      return 60 * 60 * 24 * 30;
  }
}

function normalizeTimeframe(timeframe?: string) {
  if (!timeframe) return "1d";
  const normalized = timeframe.toLowerCase().replace("60m", "1h").replace("120m", "2h");
  return VALID_TIMEFRAMES.has(normalized) ? normalized : "1d";
}

function toMarketCandle(timestamp: number, open: number, high: number, low: number, close: number, volume?: number): MarketCandle {
  return {
    time: Math.floor(timestamp) as UTCTimestamp,
    open,
    high,
    low,
    close,
    volume,
  };
}

async function fetchFinnhubCandles(symbol: string, timeframe: string): Promise<MarketCandle[]> {
  const resolution = getFinnhubResolution(timeframe);
  const to = Math.floor(Date.now() / 1000);
  const from = to - getWindowSeconds(timeframe);
  const params = new URLSearchParams({ symbol, resolution, from: String(from), to: String(to), token: FINNHUB_API_KEY ?? "" });
  const response = await fetch(`https://finnhub.io/api/v1/stock/candle?${params.toString()}`);
  if (!response.ok) throw new Error(`Finnhub candles request failed: ${response.status}`);
  const json = await response.json();
  if (json.s !== "ok" || !Array.isArray(json.t)) {
    throw new Error("Finnhub returned an invalid candle payload.");
  }

  return json.t.map((timestamp: number, index: number) =>
    toMarketCandle(timestamp, Number(json.o[index]), Number(json.h[index]), Number(json.l[index]), Number(json.c[index]), Number(json.v?.[index] ?? 0))
  );
}

async function fetchAlphaVantageCandles(symbol: string, timeframe: string): Promise<MarketCandle[]> {
  const func = getAlphaVantageFunction(timeframe);
  const interval = getAlphaVantageInterval(timeframe);
  const params = new URLSearchParams({ function: func, symbol, apikey: ALPHAVANTAGE_API_KEY ?? "" });
  if (func === "TIME_SERIES_INTRADAY") {
    params.set("interval", interval);
    params.set("outputsize", "compact");
  }

  const response = await fetch(`https://www.alphavantage.co/query?${params.toString()}`);
  if (!response.ok) throw new Error(`Alpha Vantage candles request failed: ${response.status}`);
  const json = await response.json();

  const seriesKey = Object.keys(json).find((key) => key.includes("Time Series"));
  if (!seriesKey || typeof json[seriesKey] !== "object") {
    throw new Error("Alpha Vantage returned an invalid candle payload.");
  }

  const entries = Object.entries(json[seriesKey] as Record<string, any>);
  return entries
    .slice(0, 500)
    .map(([timestamp, bar]) => {
      const open = Number(bar["1. open"]);
      const high = Number(bar["2. high"]);
      const low = Number(bar["3. low"]);
      const close = Number(bar["4. close"]);
      const volume = Number(bar["5. volume"] ?? 0);
      const time = Math.floor(new Date(timestamp).getTime() / 1000);
      return toMarketCandle(time, open, high, low, close, volume);
    })
    .reverse();
}

async function fetchFinnhubQuote(symbol: string): Promise<Quote> {
  const params = new URLSearchParams({ symbol, token: FINNHUB_API_KEY ?? "" });
  const response = await fetch(`https://finnhub.io/api/v1/quote?${params.toString()}`);
  if (!response.ok) throw new Error(`Finnhub quote request failed: ${response.status}`);
  const json = await response.json();
  return {
    symbol,
    current: Number(json.c),
    high: Number(json.h),
    low: Number(json.l),
    open: Number(json.o),
    prevClose: Number(json.pc),
    timestamp: Math.floor(Date.now() / 1000),
  };
}

async function fetchAlphaVantageQuote(symbol: string): Promise<Quote> {
  const params = new URLSearchParams({ function: "GLOBAL_QUOTE", symbol, apikey: ALPHAVANTAGE_API_KEY ?? "" });
  const response = await fetch(`https://www.alphavantage.co/query?${params.toString()}`);
  if (!response.ok) throw new Error(`Alpha Vantage quote request failed: ${response.status}`);
  const json = await response.json();
  const raw = json?.["Global Quote"];
  if (!raw) throw new Error("Alpha Vantage returned an invalid quote payload.");

  return {
    symbol,
    current: Number(raw["05. price"]),
    high: Number(raw["03. high"]),
    low: Number(raw["04. low"]),
    open: Number(raw["02. open"]),
    prevClose: Number(raw["08. previous close"]),
    timestamp: Math.floor(Date.now() / 1000),
  };
}

async function fetchFinnhubSearch(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, token: FINNHUB_API_KEY ?? "" });
  const response = await fetch(`https://finnhub.io/api/v1/search?${params.toString()}`);
  if (!response.ok) throw new Error(`Finnhub search request failed: ${response.status}`);
  const json = await response.json();
  if (!Array.isArray(json.result)) return [];
  return json.result.slice(0, 12).map((item: any) => ({
    symbol: String(item.symbol).toUpperCase(),
    description: String(item.description || item.displaySymbol || ""),
    exchange: String(item.exchange || ""),
    type: String(item.type || ""),
  }));
}

async function fetchAlphaVantageSearch(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ function: "SYMBOL_SEARCH", keywords: query, apikey: ALPHAVANTAGE_API_KEY ?? "" });
  const response = await fetch(`https://www.alphavantage.co/query?${params.toString()}`);
  if (!response.ok) throw new Error(`Alpha Vantage search request failed: ${response.status}`);
  const json = await response.json();
  if (!Array.isArray(json?.bestMatches)) return [];

  return json.bestMatches.slice(0, 12).map((item: any) => ({
    symbol: String(item["1. symbol"]).toUpperCase(),
    description: String(item["2. name"] || ""),
    exchange: String(item["4. region"] || ""),
    type: String(item["3. type"] || ""),
  }));
}

function getCacheKey(prefix: string, symbol: string, timeframe?: string) {
  return `${prefix}:${symbol}:${timeframe ?? "default"}`;
}

export async function fetchCandles(symbol: string, timeframe?: string): Promise<MarketCandle[]> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const cacheKey = getCacheKey("candles", normalizedSymbol, normalizedTimeframe);
  const cached = candleCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.candles;
  }

  const provider = getProviderName();
  const candles = provider === "finnhub"
    ? await fetchFinnhubCandles(normalizedSymbol, normalizedTimeframe)
    : await fetchAlphaVantageCandles(normalizedSymbol, normalizedTimeframe);

  candleCache.set(cacheKey, { expires: Date.now() + DEFAULT_CANDLE_TTL, candles });
  return candles;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const cacheKey = getCacheKey("quote", normalizedSymbol);
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.quote;
  }

  const provider = getProviderName();
  const quote = provider === "finnhub"
    ? await fetchFinnhubQuote(normalizedSymbol)
    : await fetchAlphaVantageQuote(normalizedSymbol);

  quoteCache.set(cacheKey, { expires: Date.now() + DEFAULT_QUOTE_TTL, quote });
  return quote;
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  const results: Record<string, Quote> = {};
  const normalized = Array.from(new Set(symbols.map(normalizeSymbol))).slice(0, 20);
  const promises = normalized.map(async (symbol) => {
    try {
      const quote = await fetchQuote(symbol);
      results[symbol] = quote;
    } catch {
      // ignore invalid symbols when fetching batch data
    }
  });

  await Promise.all(promises);
  return results;
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const searchTerm = query.trim();
  if (!searchTerm) return [];
  const cacheKey = `search:${searchTerm}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.results;
  }

  const provider = getProviderName();
  const results = provider === "finnhub"
    ? await fetchFinnhubSearch(searchTerm)
    : await fetchAlphaVantageSearch(searchTerm);

  searchCache.set(cacheKey, { expires: Date.now() + DEFAULT_SEARCH_TTL, results });
  return results;
}
