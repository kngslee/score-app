import { DEFAULT_WATCHLIST } from "./symbols";

const WATCHLIST_KEY = "swing-terminal-watchlist";
const DEFAULT_SYMBOLS = DEFAULT_WATCHLIST;

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getWatchlist(): string[] {
  const storage = safeLocalStorage();
  if (!storage) return DEFAULT_SYMBOLS;

  try {
    const raw = storage.getItem(WATCHLIST_KEY);
    if (!raw) return DEFAULT_SYMBOLS;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return DEFAULT_SYMBOLS;
    return parsed.map((symbol) => symbol.toUpperCase()).filter(Boolean);
  } catch {
    return DEFAULT_SYMBOLS;
  }
}

export function persistWatchlist(symbols: string[]) {
  const storage = safeLocalStorage();
  if (!storage) return;

  const normalized = Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
  try {
    storage.setItem(WATCHLIST_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage failures in restrictive browsers
  }
}

export function addSymbol(symbol: string): string[] {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return getWatchlist();

  const current = getWatchlist();
  if (current.includes(normalized)) return current;

  const next = [...current, normalized];
  persistWatchlist(next);
  return next;
}

export function removeSymbol(symbol: string): string[] {
  const normalized = symbol.trim().toUpperCase();
  const next = getWatchlist().filter((item) => item !== normalized);
  persistWatchlist(next);
  return next.length > 0 ? next : DEFAULT_SYMBOLS;
}
