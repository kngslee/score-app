import type { ScoringResult } from "./scoring";

const GROK_API_KEY = process.env.GROK_API_KEY;

function parseGrokResponse(output: unknown): string {
  if (!output || typeof output !== "object") {
    return "";
  }

  const response = output as { [key: string]: unknown };
  const items = Array.isArray(response.output) ? response.output : [];

  return items
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) return "";
      return content
        .map((chunk) => {
          if (typeof chunk === "string") return chunk;
          if (chunk && typeof chunk === "object" && typeof (chunk as any).text === "string") {
            return (chunk as any).text;
          }
          return "";
        })
        .filter(Boolean)
        .join("");
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export async function explainScoreWithGrok({
  symbol,
  score,
}: {
  symbol: string;
  score: ScoringResult;
}): Promise<string> {
  if (!GROK_API_KEY) {
    throw new Error("Missing GROK_API_KEY environment variable.");
  }

  const prompt = `You are a financial analytics assistant. Explain why the stock ${symbol} received this score based on the score breakdown below. Keep the explanation concise, plain language, and mention breakout state, breakout probability, confidence tier, institutional class, market regime, RSI, and momentum. Do not give investment advice.\n\nScore details:\nOverall Score: ${score.overallScore.toFixed(0)}\nBreakout State: ${score.breakoutState}\nBreakout Probability: ${score.breakoutProbability.toFixed(1)}%\nConfidence Tier: ${score.probabilityTier}\nInstitutional Class: ${score.institutionalClass}\nMarket Regime: ${score.marketRegime}\nRSI: ${score.rsi.toFixed(1)}\nMomentum: ${score.momentum.toFixed(1)}%\nLast Price: $${score.lastPrice.toFixed(2)}\n`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-1",
      input: prompt,
      max_output_tokens: 500,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Grok API request failed: ${response.status} ${response.statusText} - ${body}`);
  }

  const json = await response.json();
  const explanation = parseGrokResponse(json);

  if (!explanation) {
    throw new Error("Grok API returned no explanation.");
  }

  return explanation;
}
