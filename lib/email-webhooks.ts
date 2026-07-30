import { EmailDeliveryStatus, Prisma } from "@prisma/client";
import type { WebhookEventPayload } from "resend";

import { prisma } from "@/lib/prisma";

type TrackedEmailEvent = Extract<
  WebhookEventPayload,
  {
    type:
      | "email.sent"
      | "email.delivered"
      | "email.delivery_delayed"
      | "email.failed"
      | "email.suppressed"
      | "email.bounced"
      | "email.complained";
  }
>;

export function deliveryUpdateForEvent(event: TrackedEmailEvent) {
  switch (event.type) {
    case "email.delivered":
      return { status: EmailDeliveryStatus.DELIVERED, error: null };
    case "email.failed":
      return {
        status: EmailDeliveryStatus.FAILED,
        error: event.data.failed.reason || "Provider reported delivery failure.",
      };
    case "email.suppressed":
      return {
        status: EmailDeliveryStatus.FAILED,
        error:
          event.data.suppressed.message || "Provider suppressed this recipient.",
      };
    case "email.bounced":
      return {
        status: EmailDeliveryStatus.BOUNCED,
        error: event.data.bounce.message || "Recipient address bounced.",
      };
    case "email.complained":
      return {
        status: EmailDeliveryStatus.COMPLAINED,
        error: "Recipient reported this message as spam.",
      };
    case "email.sent":
    case "email.delivery_delayed":
      return { status: EmailDeliveryStatus.ACCEPTED, error: null };
  }
}

export function replaceableStatusesFor(
  nextStatus: EmailDeliveryStatus,
): EmailDeliveryStatus[] {
  switch (nextStatus) {
    case EmailDeliveryStatus.ACCEPTED:
      return [
        EmailDeliveryStatus.PROCESSING,
        EmailDeliveryStatus.ACCEPTED,
      ];
    case EmailDeliveryStatus.DELIVERED:
      return [
        EmailDeliveryStatus.PROCESSING,
        EmailDeliveryStatus.ACCEPTED,
        EmailDeliveryStatus.DELIVERED,
      ];
    case EmailDeliveryStatus.FAILED:
      return [
        EmailDeliveryStatus.PROCESSING,
        EmailDeliveryStatus.ACCEPTED,
        EmailDeliveryStatus.DELIVERED,
        EmailDeliveryStatus.FAILED,
      ];
    case EmailDeliveryStatus.BOUNCED:
      return [
        EmailDeliveryStatus.PROCESSING,
        EmailDeliveryStatus.ACCEPTED,
        EmailDeliveryStatus.DELIVERED,
        EmailDeliveryStatus.FAILED,
        EmailDeliveryStatus.BOUNCED,
      ];
    case EmailDeliveryStatus.COMPLAINED:
      return Object.values(EmailDeliveryStatus);
    default:
      throw new Error(`Unsupported email delivery status: ${nextStatus}`);
  }
}

export function requiresChronologicalOrdering(status: EmailDeliveryStatus) {
  const orderedStatuses: EmailDeliveryStatus[] = [
    EmailDeliveryStatus.PROCESSING,
    EmailDeliveryStatus.ACCEPTED,
    EmailDeliveryStatus.DELIVERED,
  ];
  return orderedStatuses.includes(status);
}

export function isTrackedEmailEvent(
  event: WebhookEventPayload,
): event is TrackedEmailEvent {
  return [
    "email.sent",
    "email.delivered",
    "email.delivery_delayed",
    "email.failed",
    "email.suppressed",
    "email.bounced",
    "email.complained",
  ].includes(event.type);
}

export async function recordEmailWebhookEvent(
  providerEventId: string,
  event: TrackedEmailEvent,
) {
  const emailLog = await prisma.emailLog.findFirst({
    where: { resendMessageId: event.data.email_id },
    select: { id: true, workspaceId: true },
  });
  if (!emailLog) {
    return "ignored" as const;
  }

  const occurredAt = new Date(event.created_at);
  const update = deliveryUpdateForEvent(event);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.emailWebhookEvent.create({
        data: {
          workspaceId: emailLog.workspaceId,
          emailLogId: emailLog.id,
          providerEventId,
          eventType: event.type,
          occurredAt,
        },
      });
      await tx.emailLog.updateMany({
        where: {
          id: emailLog.id,
          status: { in: replaceableStatusesFor(update.status) },
          ...(requiresChronologicalOrdering(update.status)
            ? {
                OR: [
                  { lastEventAt: null },
                  { lastEventAt: { lte: occurredAt } },
                ],
              }
            : {}),
        },
        data: {
          ...update,
          lastEventAt: occurredAt,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "duplicate" as const;
    }
    throw error;
  }

  return "recorded" as const;
}
