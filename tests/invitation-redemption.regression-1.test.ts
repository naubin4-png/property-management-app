import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvitationStatus, MembershipRole, type Prisma } from "@prisma/client";

import { redeemInvitationInTransaction } from "../lib/invitation-redemption";

type StoredInvitation = {
  createdAt: Date;
  email: string;
  expiresAt: Date;
  id: string;
  role: MembershipRole;
  status: InvitationStatus;
  workspaceId: string;
};

function fakeTransaction(input: {
  invitation?: StoredInvitation;
  membership?: { revokedAt: Date | null; workspaceId: string };
}) {
  let membership = input.membership ?? null;
  const invitation = input.invitation;
  let claims = 0;

  const tx = {
    workspaceMembership: {
      async findFirst() {
        return membership;
      },
      async create(args: {
        data: { userId: string; workspaceId: string };
      }) {
        membership = {
          revokedAt: null,
          workspaceId: args.data.workspaceId,
        };
        return args.data;
      },
    },
    workspaceInvitation: {
      async findFirst() {
        return invitation?.status === InvitationStatus.PENDING
          ? invitation
          : null;
      },
      async updateMany(args: {
        data: { status: InvitationStatus };
        where: { id?: string; expiresAt?: { gt?: Date; lte?: Date } };
      }) {
        if (!invitation || invitation.status !== InvitationStatus.PENDING) {
          return { count: 0 };
        }
        if (
          args.where.expiresAt?.lte &&
          invitation.expiresAt <= args.where.expiresAt.lte
        ) {
          invitation.status = InvitationStatus.EXPIRED;
          return { count: 1 };
        }
        if (
          args.where.id === invitation.id &&
          args.where.expiresAt?.gt &&
          invitation.expiresAt > args.where.expiresAt.gt
        ) {
          claims += 1;
          if (claims === 1) {
            invitation.status = InvitationStatus.REDEEMED;
            return { count: 1 };
          }
        }
        return { count: 0 };
      },
    },
    appSettings: {
      async upsert() {
        return {};
      },
    },
  };

  return tx as unknown as Pick<
    Prisma.TransactionClient,
    "appSettings" | "workspaceInvitation" | "workspaceMembership"
  >;
}

const now = new Date("2026-07-29T00:00:00.000Z");

function pendingInvitation(overrides: Partial<StoredInvitation> = {}) {
  return {
    createdAt: new Date("2026-07-28T00:00:00.000Z"),
    email: "client@gmail.com",
    expiresAt: new Date("2026-08-12T00:00:00.000Z"),
    id: "invitation-id",
    role: MembershipRole.OWNER,
    status: InvitationStatus.PENDING,
    workspaceId: "workspace-id",
    ...overrides,
  };
}

// Regression: ISSUE-002 — invitation lifecycle and concurrent claims lacked
// durable coverage
// Found by /qa on 2026-07-29
// Report: ~/.gstack/projects/property-manager/real-client-acceptance-2026-07-29/qa-reports
describe("workspace invitation redemption lifecycle", () => {
  it("accepts one pending invitation and treats a replay as membership return", async () => {
    const tx = fakeTransaction({ invitation: pendingInvitation() });

    const accepted = await redeemInvitationInTransaction(tx, {
      email: "client@gmail.com",
      now,
      userId: "client-user",
    });
    const replayed = await redeemInvitationInTransaction(tx, {
      email: "client@gmail.com",
      now,
      userId: "client-user",
    });

    assert.deepEqual(accepted, {
      redeemed: true,
      workspaceId: "workspace-id",
    });
    assert.deepEqual(replayed, {
      redeemed: false,
      reason: "already_member",
      workspaceId: "workspace-id",
    });
  });

  it("expires an elapsed invitation instead of accepting it", async () => {
    const invitation = pendingInvitation({
      expiresAt: new Date("2026-07-28T23:59:59.000Z"),
    });
    const result = await redeemInvitationInTransaction(
      fakeTransaction({ invitation }),
      {
        email: invitation.email,
        now,
        userId: "client-user",
      },
    );

    assert.deepEqual(result, {
      redeemed: false,
      reason: "invitation_required",
    });
    assert.equal(invitation.status, InvitationStatus.EXPIRED);
  });

  it("does not accept revoked invitations", async () => {
    const result = await redeemInvitationInTransaction(
      fakeTransaction({
        invitation: pendingInvitation({
          status: InvitationStatus.REVOKED,
        }),
      }),
      {
        email: "client@gmail.com",
        now,
        userId: "client-user",
      },
    );

    assert.deepEqual(result, {
      redeemed: false,
      reason: "invitation_required",
    });
  });

  it("does not let a new invitation bypass revoked membership access", async () => {
    const result = await redeemInvitationInTransaction(
      fakeTransaction({
        invitation: pendingInvitation(),
        membership: {
          revokedAt: new Date("2026-07-29T00:00:00.000Z"),
          workspaceId: "workspace-id",
        },
      }),
      {
        email: "client@gmail.com",
        now,
        userId: "client-user",
      },
    );

    assert.deepEqual(result, {
      redeemed: false,
      reason: "access_revoked",
      workspaceId: "workspace-id",
    });
  });

  it("allows only one winner when acceptance happens simultaneously", async () => {
    const tx = fakeTransaction({ invitation: pendingInvitation() });
    const attempts = await Promise.allSettled([
      redeemInvitationInTransaction(tx, {
        email: "client@gmail.com",
        now,
        userId: "client-user-a",
      }),
      redeemInvitationInTransaction(tx, {
        email: "client@gmail.com",
        now,
        userId: "client-user-b",
      }),
    ]);

    const redeemedCount = attempts.filter(
      (attempt) =>
        attempt.status === "fulfilled" && attempt.value.redeemed === true,
    ).length;
    assert.equal(redeemedCount, 1);
    assert.equal(
      attempts.every((attempt) => attempt.status === "fulfilled"),
      true,
    );
  });
});
