import { NextResponse } from "next/server";

export async function GET() {
  const webhookConfigured = !!process.env.DISCORD_WEBHOOK_URL;
  return NextResponse.json({ webhookConfigured });
}
