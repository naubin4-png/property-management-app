import { PeriodStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  const cutoff = utcToday();
  cutoff.setUTCDate(cutoff.getUTCDate() - settings.gracePeriodDays);

  const result = await prisma.paymentPeriod.updateMany({
    where: {
      status: PeriodStatus.PENDING,
      periodMonth: { lte: cutoff },
    },
    data: { status: PeriodStatus.LATE },
  });

  return NextResponse.json({
    cutoff: cutoff.toISOString().slice(0, 10),
    flagged: result.count,
  });
}
