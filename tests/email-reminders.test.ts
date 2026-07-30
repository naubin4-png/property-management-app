import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EmailDeliveryStatus, TriggerType } from "@prisma/client";

import { dashboardEmailActivityFromLog } from "../lib/dashboard";
import {
  lateNoticePeriodForToday,
  processReminderPeriods,
  reminderPeriodForToday,
  renderTemplate,
  tenantEmailAutomationEnabled,
  unknownEmailPlaceholders,
  type ReminderPeriod,
} from "../lib/email-reminders";

describe("tenant email settings", () => {
  it("uses the two message controls as the automation switch", () => {
    assert.equal(
      tenantEmailAutomationEnabled({
        sendBeforeDue: false,
        sendAfterDue: false,
      }),
      false,
    );
    assert.equal(
      tenantEmailAutomationEnabled({
        sendBeforeDue: true,
        sendAfterDue: false,
      }),
      true,
    );
    assert.equal(
      tenantEmailAutomationEnabled({
        sendBeforeDue: false,
        sendAfterDue: true,
      }),
      true,
    );
  });
});

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function period(overrides: Partial<ReminderPeriod> = {}): ReminderPeriod {
  return {
    periodMonth: date("2026-07-01"),
    amountDueCents: 125000,
    lease: {
      id: "lease-1",
      tenant: {
        id: "tenant-1",
        name: "Morgan Tenant",
        email: "morgan@example.com",
      },
      property: { name: "Harbor Office" },
    },
    ...overrides,
  };
}

function deps(options: {
  existing?: { id: string; status: EmailDeliveryStatus } | null;
  sendFails?: boolean;
  claimSucceeds?: boolean;
} = {}) {
  const calls = {
    createProcessingLog: 0,
    findExistingLog: 0,
    markFailed: 0,
    markAccepted: 0,
    claimFailedLog: 0,
    sendEmail: 0,
  };

  return {
    calls,
    impl: {
      async createProcessingLog() {
        calls.createProcessingLog += 1;
        return { id: "log-new", status: EmailDeliveryStatus.PROCESSING };
      },
      async findExistingLog() {
        calls.findExistingLog += 1;
        return options.existing ?? null;
      },
      async markFailed() {
        calls.markFailed += 1;
      },
      async markAccepted() {
        calls.markAccepted += 1;
      },
      async claimFailedLog() {
        calls.claimFailedLog += 1;
        return options.claimSucceeds ?? true;
      },
      async sendEmail() {
        calls.sendEmail += 1;
        if (options.sendFails) {
          throw new Error("Mailbox unavailable");
        }
        return { id: "resend-1" };
      },
    },
  };
}

describe("email reminder templates and timing", () => {
  it("renders supported placeholders and reports unknown placeholders", () => {
    assert.equal(
      renderTemplate(
        "Hi {tenant_name}: {property_name} owes {amount_due} on {due_date}.",
        period(),
      ),
      "Hi Morgan Tenant: Harbor Office owes $1250.00 on Jul 1, 2026.",
    );

    assert.deepEqual(
      unknownEmailPlaceholders(
        "Known {tenant_name}, unknown {owner_name}",
        "Also {portal_link}",
      ),
      ["{owner_name}", "{portal_link}"],
    );
  });

  it("selects reminder and late-notice periods from due date plus grace period", () => {
    assert.equal(
      reminderPeriodForToday(date("2026-06-28"), 3)?.toISOString(),
      "2026-07-01T00:00:00.000Z",
    );
    assert.equal(reminderPeriodForToday(date("2026-06-27"), 3), null);
    assert.equal(
      lateNoticePeriodForToday(date("2026-07-06"), 5)?.toISOString(),
      "2026-07-01T00:00:00.000Z",
    );
    assert.equal(lateNoticePeriodForToday(date("2026-07-05"), 5), null);
  });
});

describe("email reminder delivery processing", () => {
  it("skips tenants without an email address without creating a failed log", async () => {
    const setup = deps();
    const result = await processReminderPeriods(
      [
        period({
          lease: {
            id: "lease-1",
            tenant: { id: "tenant-1", name: "Morgan Tenant", email: null },
            property: { name: "Harbor Office" },
          },
        }),
      ],
      TriggerType.RENT_REMINDER,
      { subject: "Reminder", body: "Body" },
      setup.impl,
    );

    assert.deepEqual(result, { sent: 0, failed: 0, skipped: 1 });
    assert.equal(setup.calls.createProcessingLog, 0);
    assert.equal(setup.calls.sendEmail, 0);
  });

  it("marks a delivery as sent only after the provider succeeds", async () => {
    const setup = deps();
    const result = await processReminderPeriods(
      [period()],
      TriggerType.RENT_REMINDER,
      { subject: "Reminder", body: "Body" },
      setup.impl,
    );

    assert.deepEqual(result, { sent: 1, failed: 0, skipped: 0 });
    assert.equal(setup.calls.createProcessingLog, 1);
    assert.equal(setup.calls.sendEmail, 1);
    assert.equal(setup.calls.markAccepted, 1);
    assert.equal(setup.calls.markFailed, 0);
  });

  it("records failed provider responses without counting them as sent", async () => {
    const setup = deps({ sendFails: true });
    const result = await processReminderPeriods(
      [period()],
      TriggerType.LATE_NOTICE,
      { subject: "Late", body: "Body" },
      setup.impl,
    );

    assert.deepEqual(result, { sent: 0, failed: 1, skipped: 0 });
    assert.equal(setup.calls.markAccepted, 0);
    assert.equal(setup.calls.markFailed, 1);
  });

  it("retries failed logs but deduplicates successful logs", async () => {
    const retrySetup = deps({
      existing: { id: "log-failed", status: EmailDeliveryStatus.FAILED },
    });
    const retryResult = await processReminderPeriods(
      [period()],
      TriggerType.LATE_NOTICE,
      { subject: "Late", body: "Body" },
      retrySetup.impl,
    );

    assert.deepEqual(retryResult, { sent: 1, failed: 0, skipped: 0 });
    assert.equal(retrySetup.calls.claimFailedLog, 1);
    assert.equal(retrySetup.calls.createProcessingLog, 0);

    const dedupeSetup = deps({
      existing: { id: "log-sent", status: EmailDeliveryStatus.DELIVERED },
    });
    const dedupeResult = await processReminderPeriods(
      [period()],
      TriggerType.LATE_NOTICE,
      { subject: "Late", body: "Body" },
      dedupeSetup.impl,
    );

    assert.deepEqual(dedupeResult, { sent: 0, failed: 0, skipped: 1 });
    assert.equal(dedupeSetup.calls.sendEmail, 0);
  });

  it("does not reclaim an in-flight retry as another send", async () => {
    const setup = deps({
      existing: {
        id: "log-processing",
        status: EmailDeliveryStatus.PROCESSING,
      },
      claimSucceeds: false,
    });
    const result = await processReminderPeriods(
      [period()],
      TriggerType.LATE_NOTICE,
      { subject: "Late", body: "Body" },
      setup.impl,
    );

    assert.deepEqual(result, { sent: 0, failed: 0, skipped: 1 });
    assert.equal(setup.calls.sendEmail, 0);
  });
});

describe("dashboard communication labels", () => {
  it("only describes successful delivery logs as sent activity", () => {
    assert.deepEqual(
      dashboardEmailActivityFromLog({
        triggerType: TriggerType.LATE_NOTICE,
        sentAt: date("2026-07-06"),
        error: null,
      }),
      {
        label: "Late notice sent",
        sentAt: date("2026-07-06"),
      },
    );

    assert.equal(
      dashboardEmailActivityFromLog({
        triggerType: TriggerType.RENT_REMINDER,
        sentAt: date("2026-06-28"),
        error: "Mailbox unavailable",
      }),
      null,
    );
  });
});
