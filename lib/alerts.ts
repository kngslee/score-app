import { ScoringResult } from "./scoring";

export type AlertLevel = "INFO" | "WARN" | "CRITICAL";

export type Alert = {
  symbol: string;
  level: AlertLevel;
  title: string;
  message: string;
  score: ScoringResult;
  timestamp: number;
};

function shouldTriggerAlert(score: ScoringResult): AlertLevel | null {
  // Only alert on high-probability setups to avoid spam
  if (score.breakoutState === "ROCKET" && score.breakoutProbability >= 75) {
    return "CRITICAL";
  }

  if (score.breakoutState === "STRONG" && score.breakoutProbability >= 65) {
    return "WARN";
  }

  // Skip low-probability signals
  return null;
}

function formatDiscordMessage(alert: Alert): {
  username: string;
  avatar_url: string;
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{
      name: string;
      value: string;
      inline: boolean;
    }>;
    timestamp: string;
  }>;
} {
  const colors = {
    CRITICAL: 15158332, // Red
    WARN: 16776960, // Yellow
    INFO: 3447003, // Blue
  };

  const score = alert.score;
  const color = colors[alert.level];

  return {
    username: "Swing Terminal",
    avatar_url: "https://cdn-icons-png.flaticon.com/512/681/681494.png",
    embeds: [
      {
        title: `${alert.level === "CRITICAL" ? "🚀 ROCKET" : "💪 STRONG"} Breakout Signal`,
        description: `${alert.symbol} has triggered a high-probability breakout setup.`,
        color,
        fields: [
          {
            name: "Symbol",
            value: `**${alert.symbol}**`,
            inline: true,
          },
          {
            name: "Price",
            value: `$${score.lastPrice.toFixed(2)}`,
            inline: true,
          },
          {
            name: "Score",
            value: `${score.overallScore.toFixed(0)}/100`,
            inline: true,
          },
          {
            name: "Breakout State",
            value: score.breakoutState,
            inline: true,
          },
          {
            name: "Probability",
            value: `${score.breakoutProbability.toFixed(0)}%`,
            inline: true,
          },
          {
            name: "Class",
            value: score.institutionalClass,
            inline: true,
          },
          {
            name: "Market Regime",
            value: score.marketRegime,
            inline: true,
          },
          {
            name: "RSI (14)",
            value: score.rsi.toFixed(1),
            inline: true,
          },
          {
            name: "Momentum 5D",
            value: `${score.momentum > 0 ? "+" : ""}${score.momentum.toFixed(1)}%`,
            inline: true,
          },
        ],
        timestamp: new Date(alert.timestamp).toISOString(),
      },
    ],
  };
}

export async function sendDiscordAlert(alert: Alert): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_URL not configured");
    return false;
  }

  try {
    const payload = formatDiscordMessage(alert);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status} ${res.statusText}`);
      return false;
    }

    console.log(`Alert sent for ${alert.symbol}: ${alert.title}`);
    return true;
  } catch (err) {
    console.error("Failed to send Discord alert:", err);
    return false;
  }
}

export function evaluateAndCreateAlert(
  symbol: string,
  score: ScoringResult
): Alert | null {
  const alertLevel = shouldTriggerAlert(score);

  if (!alertLevel) {
    return null;
  }

  let title = "";
  let message = "";

  if (alertLevel === "CRITICAL") {
    title = `🚀 ROCKET BREAKOUT: ${symbol}`;
    message = `Institutional-grade breakout detected. Class ${score.institutionalClass}, ${score.breakoutProbability.toFixed(0)}% probability.`;
  } else if (alertLevel === "WARN") {
    title = `💪 STRONG SETUP: ${symbol}`;
    message = `Strong breakout conditions forming. Class ${score.institutionalClass}, ${score.breakoutProbability.toFixed(0)}% probability.`;
  }

  return {
    symbol,
    level: alertLevel,
    title,
    message,
    score,
    timestamp: Date.now(),
  };
}
