import "server-only";

import { InvitationStatus, Prisma } from "@prisma/client";

import {
  isVerifiedGoogleUser,
  normalizeInvitationEmail,
} from "@/lib/invitation-identity";
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
      async (tx) => {
        const existingMembership = await tx.workspaceMembership.findFirst({
          where: { userId: user.id },
          select: { revokedAt: true, workspaceId: true },
        });
        if (existingMembership) {
          if (existingMembership.revokedAt) {
            return {
              redeemed: false,
              reason: "access_revoked",
              workspaceId: existingMembership.workspaceId,
            } as const;
          }
          return {
            redeemed: false,
            reason: "already_member",
            workspaceId: existingMembership.workspaceId,
          } as const;
        }

        await tx.workspaceInvitation.updateMany({
          where: {
            email,
            status: InvitationStatus.PENDING,
            expiresAt: { lte: now },
          },
          data: { status: InvitationStatus.EXPIRED },
        });

        const invitation = await tx.workspaceInvitation.findFirst({
          where: {
            email,
            status: InvitationStatus.PENDING,
            expiresAt: { gt: now },
          },
          orderBy: { createdAt: "desc" },
        });
        if (!invitation) {
          return { redeemed: false, reason: "invitation_required" } as const;
        }

        const claimed = await tx.workspaceInvitation.updateMany({
          where: {
            id: invitation.id,
            status: InvitationStatus.PENDING,
            expiresAt: { gt: now },
          },
          data: {
            status: InvitationStatus.REDEEMED,
            redeemedAt: now,
            redeemedUserId: user.id,
          },
        });
        if (claimed.count !== 1) {
          throw new Error("Invitation was already used.");
        }

        await tx.workspaceMembership.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId: user.id,
            role: invitation.role,
          },
        });

        await tx.appSettings.upsert({
          where: { workspaceId: invitation.workspaceId },
          update: {},
          create: {
            workspaceId: invitation.workspaceId,
            replyToEmail: email,
          },
        });

        return {
          redeemed: true,
          workspaceId: invitation.workspaceId,
        } as const;
      },
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
