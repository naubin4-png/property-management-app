import { NextRequest, NextResponse } from "next/server";

import {
  isTrackedEmailEvent,
  recordEmailWebhookEvent,
} from "@/lib/email-webhooks";
import { getResendClient, getResendWebhookSecret } from "@/lib/resend";

export async function POST(request: NextRequest) {
  const providerEventId = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!providerEventId || !timestamp || !signature) {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  let event;
  try {
    event = getResendClient().webhooks.verify({
      payload: await request.text(),
      headers: {
        id: providerEventId,
        timestamp,
        signature,
      },
      webhookSecret: getResendWebhookSecret(),
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  }

  if (!isTrackedEmailEvent(event)) {
    return NextResponse.json({ result: "ignored" });
  }

  const result = await recordEmailWebhookEvent(providerEventId, event);
  return NextResponse.json({ result });
}
