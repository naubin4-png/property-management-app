import { EmailSettingsView } from "@/components/email-settings-view";
import { firstDayOfCurrentMonth } from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

import { retryEmailDelivery, saveEmailSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; saved?: string }>;
}) {
  const { property, saved } = await searchParams;
  const currentMonth = firstDayOfCurrentMonth();
  const [settings, activeLeases, filteredProperty, propertyLeaseIds] =
    await Promise.all([
      getSettings(),
      prisma.lease.findMany({
        where: {
          firstPeriodMonth: { lte: currentMonth },
          OR: [
            { lastPeriodMonth: null },
            { lastPeriodMonth: { gte: currentMonth } },
          ],
        },
        orderBy: { property: { name: "asc" } },
        include: {
          property: true,
          tenant: true,
        },
      }),
      property
        ? prisma.property.findUnique({
            where: { id: property },
            select: { name: true },
          })
        : Promise.resolve(null),
      property
        ? prisma.lease.findMany({
            where: { propertyId: property },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);
  const emailLogs = await prisma.emailLog.findMany({
    where: property
      ? {
          leaseId: { in: propertyLeaseIds.map((lease) => lease.id) },
        }
      : undefined,
    orderBy: { sentAt: "desc" },
    take: 20,
    include: {
      tenant: true,
    },
  });
  const logLeaseIds = [
    ...new Set(emailLogs.map((log) => log.leaseId).filter(Boolean)),
  ] as string[];
  const logLeases = await prisma.lease.findMany({
    where: { id: { in: logLeaseIds } },
    include: {
      property: true,
    },
  });
  const leaseContextById = new Map(
    logLeases.map((lease) => [lease.id, lease.property.name]),
  );
  const coverage = {
    activeCount: activeLeases.length,
    canReceiveCount: activeLeases.filter((lease) => lease.tenant.email).length,
    missingEmail: activeLeases
      .filter((lease) => !lease.tenant.email)
      .map((lease) => ({
        propertyId: lease.propertyId,
        propertyName: lease.property.name,
        tenantName: lease.tenant.name,
      })),
  };

  return (
    <EmailSettingsView
      action={saveEmailSettings}
      coverage={coverage}
      emailLogs={emailLogs.map((log) => ({
        id: log.id,
        propertyName: log.leaseId
          ? (leaseContextById.get(log.leaseId) ?? null)
          : null,
        tenantName: log.tenant?.name ?? null,
        subject: log.subject,
        toAddress: log.toAddress,
        sentAt: log.sentAt,
        triggerType: log.triggerType,
        error: log.error,
      }))}
      filteredPropertyId={property}
      filteredPropertyName={filteredProperty?.name}
      retryAction={retryEmailDelivery}
      saved={saved === "1"}
      settings={settings}
    />
  );
}
