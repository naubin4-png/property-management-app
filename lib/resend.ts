import { Resend } from "resend";

let resend: Resend | null = null;

export function emailProviderReadiness() {
  const required: [string, string | undefined][] = [
    ["RESEND_API_KEY", process.env.RESEND_API_KEY],
    ["EMAIL_FROM", process.env.EMAIL_FROM],
    ["RESEND_WEBHOOK_SECRET", process.env.RESEND_WEBHOOK_SECRET],
  ];
  const missing = required
    .filter(([, value]) => !value)
    .map(([name]) => name);

  return {
    configured: missing.length === 0,
    missing,
  };
}

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  resend ??= new Resend(apiKey);
  return resend;
}

export function getResendWebhookSecret() {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("RESEND_WEBHOOK_SECRET is not configured.");
  }
  return secret;
}

export function getEmailFromAddress() {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }
  return from;
}
