import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ pong: true, method: "GET", timestamp: Date.now() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ pong: true, method: "POST", echo: body, timestamp: Date.now() });
}
