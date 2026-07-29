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

  const workspaces = await prisma.workspace.findMany({
    select: { id: true },
  });
  let flagged = 0;
  const cutoffs: Record<string, string> = {};
  for (const workspace of workspaces) {
    const settings = await getSettings(workspace.id);
    const cutoff = utcToday();
    cutoff.setUTCDate(cutoff.getUTCDate() - settings.gracePeriodDays);
    const result = await prisma.paymentPeriod.updateMany({
      where: {
        workspaceId: workspace.id,
        status: PeriodStatus.PENDING,
        periodMonth: { lte: cutoff },
      },
      data: { status: PeriodStatus.LATE },
    });
    flagged += result.count;
    cutoffs[workspace.id] = cutoff.toISOString().slice(0, 10);
  }

  return NextResponse.json({
    workspaces: workspaces.length,
    cutoffs,
    flagged,
  });
}
