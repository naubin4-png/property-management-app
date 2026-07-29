import "server-only";

import { Prisma } from "@prisma/client";

import {
  isVerifiedGoogleUser,
  normalizeInvitationEmail,
} from "@/lib/invitation-identity";
import { redeemInvitationInTransaction } from "@/lib/invitation-redemption";
import { prisma } from "@/lib/prisma";

const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

export async function redeemWorkspaceInvitation(user: {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  app_metadata?: { provider?: string; providers?: string[] };
}) {
  if (!isVerifiedGoogleUser(user) || !user.email) {
    return { redeemed: false, reason: "google_required" } as const;
  }

  const email = normalizeInvitationEmail(user.email);
  const now = new Date();

  try {
    return await prisma.$transaction(
      (tx) =>
        redeemInvitationInTransaction(tx, {
          email,
          now,
          userId: user.id,
        }),
      transactionOptions,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2034"].includes(error.code)
    ) {
      const membership = await prisma.workspaceMembership.findFirst({
        where: { userId: user.id },
        select: { revokedAt: true, workspaceId: true },
      });
      if (membership) {
        if (membership.revokedAt) {
          return {
            redeemed: false,
            reason: "access_revoked",
            workspaceId: membership.workspaceId,
          } as const;
        }
        return {
          redeemed: false,
          reason: "already_member",
          workspaceId: membership.workspaceId,
        } as const;
      }
    }
    throw error;
  }
}
