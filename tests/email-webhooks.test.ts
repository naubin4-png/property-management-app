import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EmailDeliveryStatus } from "@prisma/client";
import type {
  EmailBouncedEvent,
  EmailComplainedEvent,
  EmailDeliveredEvent,
  EmailFailedEvent,
} from "resend";

import {
  deliveryUpdateForEvent,
  replaceableStatusesFor,
} from "../lib/email-webhooks";

const baseData = {
  created_at: "2026-07-29T00:00:00.000Z",
  email_id: "email-1",
  from: "Property Manager <reminders@example.com>",
  to: ["tenant@example.com"],
  subject: "Rent reminder",
};

describe("Resend delivery lifecycle", () => {
  it("distinguishes provider acceptance from mailbox delivery", () => {
    const delivered: EmailDeliveredEvent = {
      type: "email.delivered",
      created_at: "2026-07-29T00:01:00.000Z",
      data: baseData,
    };

    assert.deepEqual(deliveryUpdateForEvent(delivered), {
      status: EmailDeliveryStatus.DELIVERED,
      error: null,
    });
  });

  it("records failure, bounce, and complaint outcomes", () => {
    const failed: EmailFailedEvent = {
      type: "email.failed",
      created_at: "2026-07-29T00:01:00.000Z",
      data: { ...baseData, failed: { reason: "Invalid domain" } },
    };
    const bounced: EmailBouncedEvent = {
      type: "email.bounced",
      created_at: "2026-07-29T00:02:00.000Z",
      data: {
        ...baseData,
        bounce: {
          message: "Mailbox rejected",
          subType: "General",
          type: "Permanent",
        },
      },
    };
    const complained: EmailComplainedEvent = {
      type: "email.complained",
      created_at: "2026-07-29T00:03:00.000Z",
      data: baseData,
    };

    assert.equal(deliveryUpdateForEvent(failed).status, EmailDeliveryStatus.FAILED);
    assert.equal(
      deliveryUpdateForEvent(bounced).status,
      EmailDeliveryStatus.BOUNCED,
    );
    assert.equal(
      deliveryUpdateForEvent(complained).status,
      EmailDeliveryStatus.COMPLAINED,
    );
  });

  it("does not let accepted or delivered events overwrite terminal failures", () => {
    assert.deepEqual(
      replaceableStatusesFor(EmailDeliveryStatus.ACCEPTED),
      [EmailDeliveryStatus.PROCESSING, EmailDeliveryStatus.ACCEPTED],
    );
    assert.deepEqual(
      replaceableStatusesFor(EmailDeliveryStatus.DELIVERED),
      [
        EmailDeliveryStatus.PROCESSING,
        EmailDeliveryStatus.ACCEPTED,
        EmailDeliveryStatus.DELIVERED,
      ],
    );
    assert.equal(
      replaceableStatusesFor(EmailDeliveryStatus.DELIVERED).includes(
        EmailDeliveryStatus.COMPLAINED,
      ),
      false,
    );
    assert.equal(
      replaceableStatusesFor(EmailDeliveryStatus.ACCEPTED).includes(
        EmailDeliveryStatus.FAILED,
      ),
      false,
    );
  });
});
