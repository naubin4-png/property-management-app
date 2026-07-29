import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class WorkspaceAccessRequiredError extends Error {
  constructor() {
    super("A workspace invitation is required.");
    this.name = "WorkspaceAccessRequiredError";
  }
}

export const getAuthenticatedUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationRequiredError();
  }

  return user;
});

export const getWorkspaceContext = cache(async () => {
  const user = await getAuthenticatedUser();
  const memberships = await prisma.workspaceMembership.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          timezone: true,
        },
      },
    },
  });

  if (memberships.length === 0) {
    throw new WorkspaceAccessRequiredError();
  }

  // The data model supports multiple memberships. The initial product assigns
  // one customer workspace per client and deterministically uses the oldest.
  const membership = memberships[0];

  return {
    userId: user.id,
    email: user.email?.trim().toLowerCase() ?? null,
    role: membership.role,
    workspaceId: membership.workspace.id,
    workspaceName: membership.workspace.name,
    timezone: membership.workspace.timezone,
  };
});

export async function requireWorkspaceRecord(
  model: "property" | "tenant" | "lease" | "payment" | "emailLog",
  id: string,
  workspaceId: string,
) {
  const where = { id, workspaceId };
  const record =
    model === "property"
      ? await prisma.property.findFirst({ where, select: { id: true } })
      : model === "tenant"
        ? await prisma.tenant.findFirst({ where, select: { id: true } })
        : model === "lease"
          ? await prisma.lease.findFirst({ where, select: { id: true } })
          : model === "payment"
            ? await prisma.payment.findFirst({ where, select: { id: true } })
            : await prisma.emailLog.findFirst({ where, select: { id: true } });

  if (!record) {
    throw new Error("Record not found.");
  }

  return record;
}
