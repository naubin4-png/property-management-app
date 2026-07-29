import "server-only";

import { notFound } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/workspace-context";

export function isPlatformAdministrator(userId: string) {
  const platformAdminUserId = process.env.PLATFORM_ADMIN_USER_ID;
  return Boolean(platformAdminUserId && userId === platformAdminUserId);
}

export async function requirePlatformAdministrator() {
  const user = await getAuthenticatedUser();
  if (!isPlatformAdministrator(user.id)) {
    notFound();
  }
  return user;
}
