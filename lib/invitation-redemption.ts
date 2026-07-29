import { InvitationStatus, type Prisma } from "@prisma/client";

type InvitationTransaction = Pick<
  Prisma.TransactionClient,
  "appSettings" | "workspaceInvitation" | "workspaceMembership"
>;

export async function redeemInvitationInTransaction(
  tx: InvitationTransaction,
  input: {
    email: string;
    now: Date;
    userId: string;
  },
) {
  const existingMembership = await tx.workspaceMembership.findFirst({
    where: { userId: input.userId },
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
      email: input.email,
      status: InvitationStatus.PENDING,
      expiresAt: { lte: input.now },
    },
    data: { status: InvitationStatus.EXPIRED },
  });

  const invitation = await tx.workspaceInvitation.findFirst({
    where: {
      email: input.email,
      status: InvitationStatus.PENDING,
      expiresAt: { gt: input.now },
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
      expiresAt: { gt: input.now },
    },
    data: {
      status: InvitationStatus.REDEEMED,
      redeemedAt: input.now,
      redeemedUserId: input.userId,
    },
  });
  if (claimed.count !== 1) {
    throw new Error("Invitation was already used.");
  }

  await tx.workspaceMembership.create({
    data: {
      workspaceId: invitation.workspaceId,
      userId: input.userId,
      role: invitation.role,
    },
  });

  await tx.appSettings.upsert({
    where: { workspaceId: invitation.workspaceId },
    update: {},
    create: {
      workspaceId: invitation.workspaceId,
      replyToEmail: input.email,
    },
  });

  return {
    redeemed: true,
    workspaceId: invitation.workspaceId,
  } as const;
}
