import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { firstDayOfNextWorkspaceMonth } from "@/lib/workspace-time";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await prisma.workspace.findMany({
    select: { id: true, timezone: true },
  });
  let created = 0;
  for (const workspace of workspaces) {
    const targetMonth = firstDayOfNextWorkspaceMonth(
      new Date(),
      workspace.timezone,
    );
    const leases = await prisma.lease.findMany({
      where: {
        workspaceId: workspace.id,
        firstPeriodMonth: { lte: targetMonth },
        OR: [
          { lastPeriodMonth: null },
          { lastPeriodMonth: { gte: targetMonth } },
        ],
      },
      select: { id: true, rentCents: true },
    });
    const result = await prisma.paymentPeriod.createMany({
      data: leases.map((lease) => ({
        workspaceId: workspace.id,
        leaseId: lease.id,
        periodMonth: targetMonth,
        amountDueCents: lease.rentCents,
      })),
      skipDuplicates: true,
    });
    created += result.count;
  }

  return NextResponse.json({
    workspaces: workspaces.length,
    created,
  });
}
