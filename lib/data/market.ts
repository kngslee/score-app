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

const DEFAULT_QUOTE_TTL = 40_000;
const DEFAULT_CANDLE_TTL = 180_000;
const DEFAULT_SEARCH_TTL = 60_000;

const VALID_TIMEFRAMES = new Set(["1m", "5m", "15m", "30m", "60m", "120m", "1h", "2h", "1d"]);

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function normalizeTimeframe(timeframe?: string) {
  if (!timeframe) return "1d";
  const normalized = timeframe.toLowerCase().replace("60m", "1h").replace("120m", "2h");
  return VALID_TIMEFRAMES.has(normalized) ? normalized : "1d";
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

function buildMockCandles(symbol: string, timeframe: string): MarketCandle[] {
  const now = Math.floor(Date.now() / 1000);
  const points = timeframe === "1d" ? 50 : 70;
  const candles: MarketCandle[] = [];
  let value = 100 + Math.sin(now / 86400) * 5 + symbol.length * 1.5;

  for (let i = points - 1; i >= 0; i--) {
    const intervalMinutes = timeframe === "1m" ? 1 : timeframe === "5m" ? 5 : timeframe === "15m" ? 15 : timeframe === "30m" ? 30 : timeframe === "1h" ? 60 : timeframe === "2h" ? 120 : 1440;
    const time = now - i * 60 * intervalMinutes;
    const open = value + (Math.random() - 0.5) * 1.2;
    const close = open + (Math.random() - 0.5) * 2.2;
    const high = Math.max(open, close) + Math.random() * 1.5;
    const low = Math.min(open, close) - Math.random() * 1.5;
    const volume = Math.round(80_000 + Math.random() * 420_000);
    candles.push(toMarketCandle(time, open, high, low, close, volume));
    value = close;
  }

  return candles;
}

function buildMockQuote(symbol: string): Quote {
  const base = 80 + symbol.charCodeAt(0) * 0.35;
  const current = base + Math.random() * 24;
  return {
    symbol,
    current: Number(current.toFixed(2)),
    high: Number((current + Math.random() * 3).toFixed(2)),
    low: Number((current - Math.random() * 3).toFixed(2)),
    open: Number((current - Math.random() * 1.5).toFixed(2)),
    prevClose: Number((current - Math.random() * 1.8).toFixed(2)),
    timestamp: Math.floor(Date.now() / 1000),
  };
}

function getCacheKey(prefix: string, symbol: string, timeframe?: string) {
  return `${prefix}:${symbol}:${timeframe ?? "default"}`;
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

export async function fetchCandles(symbol: string, timeframe?: string): Promise<MarketCandle[]> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const normalizedTimeframe = normalizeTimeframe(timeframe);
  const cacheKey = getCacheKey("candles", normalizedSymbol, normalizedTimeframe);
  const cached = candleCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.candles;
  }

  const provider = FINNHUB_API_KEY ? "finnhub" : ALPHAVANTAGE_API_KEY ? "alphavantage" : "mock";
  let candles: MarketCandle[];
  let shouldCache = provider === "mock";

  try {
    if (provider === "finnhub") {
      candles = await fetchFinnhubCandles(normalizedSymbol, normalizedTimeframe);
    } else if (provider === "alphavantage") {
      candles = await fetchAlphaVantageCandles(normalizedSymbol, normalizedTimeframe);
    } else {
      candles = buildMockCandles(normalizedSymbol, normalizedTimeframe);
    }
    shouldCache = true;
  } catch (error) {
    console.warn(`Market candle fetch failed for ${normalizedSymbol}:`, error);
    candles = buildMockCandles(normalizedSymbol, normalizedTimeframe);
  }

  if (shouldCache) {
    candleCache.set(cacheKey, { expires: Date.now() + DEFAULT_CANDLE_TTL, candles });
  }
  return candles;
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const cacheKey = getCacheKey("quote", normalizedSymbol);
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.quote;
  }

  const provider = FINNHUB_API_KEY ? "finnhub" : ALPHAVANTAGE_API_KEY ? "alphavantage" : "mock";
  let quote: Quote;
  let shouldCache = provider === "mock";

  try {
    if (provider === "finnhub") {
      quote = await fetchFinnhubQuote(normalizedSymbol);
    } else if (provider === "alphavantage") {
      quote = await fetchAlphaVantageQuote(normalizedSymbol);
    } else {
      quote = buildMockQuote(normalizedSymbol);
    }
    shouldCache = true;
  } catch (error) {
    console.warn(`Market quote fetch failed for ${normalizedSymbol}:`, error);
    quote = buildMockQuote(normalizedSymbol);
  }

  if (shouldCache) {
    quoteCache.set(cacheKey, { expires: Date.now() + DEFAULT_QUOTE_TTL, quote });
  }
  return quote;
}

export async function fetchBatchQuotes(symbols: string[]): Promise<Record<string, Quote>> {
  return fetchWatchlistData(symbols);
}

export async function fetchWatchlistData(symbols: string[]): Promise<Record<string, Quote>> {
  const results: Record<string, Quote> = {};
  const normalized = Array.from(new Set(symbols.map(normalizeSymbol))).slice(0, 25);

  await Promise.all(
    normalized.map(async (symbol) => {
      try {
        results[symbol] = await fetchQuote(symbol);
      } catch {
        // ignore invalid symbol
      }
    })
  );

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

  const provider = FINNHUB_API_KEY ? "finnhub" : ALPHAVANTAGE_API_KEY ? "alphavantage" : "mock";
  let results: SearchResult[] = [];

  try {
    if (provider === "finnhub") {
      results = await fetchFinnhubSearch(searchTerm);
    } else if (provider === "alphavantage") {
      results = await fetchAlphaVantageSearch(searchTerm);
    } else {
      results = [{ symbol: searchTerm.toUpperCase(), description: "Mock search result" }];
    }

    if (results.length > 0) {
      searchCache.set(cacheKey, { expires: Date.now() + DEFAULT_SEARCH_TTL, results });
    }
  } catch (error) {
    console.warn(`Search fetch failed for ${searchTerm}:`, error);
  }

  return results;
}
