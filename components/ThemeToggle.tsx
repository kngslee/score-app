"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";

const THEMES = ["dark", "light", "blurpurple"] as const;

type ThemeName = (typeof THEMES)[number];

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = useMemo(() => {
    if (!mounted) return "system";
    return theme === "system" ? systemTheme || "dark" : theme;
  }, [mounted, theme, systemTheme]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.8)] backdrop-blur-xl">
      {THEMES.map((themeName) => {
        const isActive = activeTheme === themeName;
        return (
          <button
            key={themeName}
            type="button"
            onClick={() => setTheme(themeName)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition-all duration-200 ${
              isActive
                ? "bg-white/15 text-white shadow-[0_8px_30px_-18px_rgba(255,255,255,0.55)]"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {themeName}
          </button>
        );
      })}
    </div>
  );
}
