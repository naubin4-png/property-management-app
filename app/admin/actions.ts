"use server";

import { InvitationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { normalizeInvitationEmail } from "@/lib/invitation-identity";
import { requirePlatformAdministrator } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";

const invitationLifetimeDays = 14;

function expirationDate() {
  const result = new Date();
  result.setUTCDate(result.getUTCDate() + invitationLifetimeDays);
  return result;
}

export async function createWorkspaceInvitation(formData: FormData) {
  const admin = await requirePlatformAdministrator();
  const name = String(formData.get("workspaceName") ?? "").trim();
  const email = normalizeInvitationEmail(
    String(formData.get("email") ?? ""),
  );
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a workspace name and valid Gmail address.");
  }
  if (!email.endsWith("@gmail.com")) {
    throw new Error("Client invitations currently require a Gmail address.");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.workspaceInvitation.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new Error(
        "This Gmail address already has invitation history. Revoke or regenerate its existing invitation.",
      );
    }

    const workspace = await tx.workspace.create({
      data: { name },
    });
    await tx.workspaceInvitation.create({
      data: {
        workspaceId: workspace.id,
        email,
        role: "OWNER",
        expiresAt: expirationDate(),
        createdBy: admin.id,
      },
    });
  });

  revalidatePath("/admin");
}

export async function revokeWorkspaceInvitation(formData: FormData) {
  await requirePlatformAdministrator();
  const invitationId = String(formData.get("invitationId") ?? "");
  await prisma.workspaceInvitation.updateMany({
    where: { id: invitationId, status: InvitationStatus.PENDING },
    data: {
      status: InvitationStatus.REVOKED,
      revokedAt: new Date(),
    },
  });
  revalidatePath("/admin");
}

export async function regenerateWorkspaceInvitation(formData: FormData) {
  const admin = await requirePlatformAdministrator();
  const invitationId = String(formData.get("invitationId") ?? "");
  await prisma.$transaction(async (tx) => {
    const current = await tx.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });
    if (!current || current.status === InvitationStatus.REDEEMED) {
      throw new Error("A redeemed invitation cannot be regenerated.");
    }
    await tx.workspaceInvitation.update({
      where: { id: current.id },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
    await tx.workspaceInvitation.create({
      data: {
        workspaceId: current.workspaceId,
        email: current.email,
        role: current.role,
        expiresAt: expirationDate(),
        createdBy: admin.id,
      },
    });
  });
  revalidatePath("/admin");
}

export async function revokeWorkspaceMembership(formData: FormData) {
  await requirePlatformAdministrator();
  const invitationId = String(formData.get("invitationId") ?? "");

  const invitation = await prisma.workspaceInvitation.findFirst({
    where: {
      id: invitationId,
      status: InvitationStatus.REDEEMED,
      redeemedUserId: { not: null },
    },
    select: { redeemedUserId: true, workspaceId: true },
  });
  if (!invitation?.redeemedUserId) {
    throw new Error("An accepted client invitation is required.");
  }

  await prisma.workspaceMembership.updateMany({
    where: {
      workspaceId: invitation.workspaceId,
      userId: invitation.redeemedUserId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/admin");
}

export async function restoreWorkspaceMembership(formData: FormData) {
  await requirePlatformAdministrator();
  const invitationId = String(formData.get("invitationId") ?? "");

  const invitation = await prisma.workspaceInvitation.findFirst({
    where: {
      id: invitationId,
      status: InvitationStatus.REDEEMED,
      redeemedUserId: { not: null },
    },
    select: { redeemedUserId: true, workspaceId: true },
  });
  if (!invitation?.redeemedUserId) {
    throw new Error("An accepted client invitation is required.");
  }

  await prisma.workspaceMembership.updateMany({
    where: {
      workspaceId: invitation.workspaceId,
      userId: invitation.redeemedUserId,
      revokedAt: { not: null },
    },
    data: { revokedAt: null },
  });

  revalidatePath("/admin");
}
