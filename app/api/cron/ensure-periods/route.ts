import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { firstDayOfNextMonth } from "@/lib/lease-math";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await getSettings();
  const targetMonth = firstDayOfNextMonth();
  const leases = await prisma.lease.findMany({
    where: {
      firstPeriodMonth: { lte: targetMonth },
      lastPeriodMonth: { gte: targetMonth },
    },
    select: { id: true, rentCents: true },
  });
  const result = await prisma.paymentPeriod.createMany({
    data: leases.map((lease) => ({
      leaseId: lease.id,
      periodMonth: targetMonth,
      amountDueCents: lease.rentCents,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    targetMonth: targetMonth.toISOString().slice(0, 10),
    created: result.count,
  });
}
