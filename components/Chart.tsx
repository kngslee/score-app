"use client";

import { useEffect, useState } from "react";

type Props = {
  symbol: string;
};

export default function Chart({ symbol }: Props) {
  const [price, setPrice] = useState<number>(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/candles?symbol=${symbol}`);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const last = data[data.length - 1];
          setPrice(last.close ?? 0);
        }
      } catch {
        setPrice(0);
      }
    }

    load();
  }, [symbol]);

  return (
    <div className="h-full flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-sm text-slate-400">Live Price</div>
        <div className="text-3xl font-bold">${price.toFixed(2)}</div>
        <div className="text-xs text-slate-500 mt-2">{symbol}</div>
      </div>
    </div>
  );
}