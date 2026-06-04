import { NextResponse } from "next/server";

export async function GET() {
  const webhookConfigured = Boolean(process.env.DISCORD_WEBHOOK_URL);

  return NextResponse.json({
    webhookConfigured,
    status: webhookConfigured ? "connected" : "missing",
  });
}
