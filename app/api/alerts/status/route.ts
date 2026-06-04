import { NextResponse } from "next/server";

export async function GET() {
  // For now: simple static status (no external dependencies)
  // You can upgrade this later to real webhook validation

  const webhookConfigured = Boolean(process.env.DISCORD_WEBHOOK_URL);

  return NextResponse.json({
    webhookConfigured,
    status: webhookConfigured
      ? "connected"
      : "missing",
  });
}