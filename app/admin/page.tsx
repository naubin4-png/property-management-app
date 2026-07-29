import Link from "next/link";

import {
  createWorkspaceInvitation,
  regenerateWorkspaceInvitation,
  restoreWorkspaceMembership,
  revokeWorkspaceInvitation,
  revokeWorkspaceMembership,
} from "@/app/admin/actions";
import { signOut } from "@/app/logout/actions";
import { membershipAccessLabel } from "@/lib/membership-access";
import { requirePlatformAdministrator } from "@/lib/platform-admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requirePlatformAdministrator();
  const invitations = await prisma.workspaceInvitation.findMany({
    orderBy: { createdAt: "desc" },
    include: { workspace: { select: { name: true } } },
  });
  const redeemedMemberships = await prisma.workspaceMembership.findMany({
    where: {
      OR: invitations.flatMap((invitation) =>
        invitation.redeemedUserId
          ? [
              {
                userId: invitation.redeemedUserId,
                workspaceId: invitation.workspaceId,
              },
            ]
          : [],
      ),
    },
    select: { revokedAt: true, userId: true, workspaceId: true },
  });
  const membershipByInvitation = new Map(
    redeemedMemberships.map((membership) => [
      `${membership.workspaceId}:${membership.userId}`,
      membership,
    ]),
  );
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://property-management-app-virid.vercel.app";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-700">Platform Admin</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Client invitations
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            className="inline-flex h-11 items-center rounded-lg border border-zinc-300 px-4 text-sm font-medium"
            href="/"
          >
            Developer Test Workspace
          </Link>
          <form action={signOut}>
            <button
              className="h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium"
              type="submit"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Invite a client</h2>
        <form
          action={createWorkspaceInvitation}
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <label className="text-sm font-medium">
            Workspace or business name
            <input
              autoFocus
              className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 font-normal"
              name="workspaceName"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Client Gmail address
            <input
              autoComplete="email"
              className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 font-normal"
              name="email"
              required
              type="email"
            />
          </label>
          <button
            className="h-11 rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white sm:col-span-2 sm:justify-self-start"
            type="submit"
          >
            Create invitation
          </button>
        </form>
        <p className="mt-5 text-sm text-zinc-600">
          Send this production link manually:{" "}
          <a className="font-medium text-blue-700 underline" href={appUrl}>
            {appUrl}
          </a>
        </p>
      </section>

      <section className="mt-6 space-y-3" aria-labelledby="invitations-heading">
        <h2 className="text-lg font-semibold" id="invitations-heading">
          Invitation status
        </h2>
        {invitations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600">
            No client invitations yet.
          </p>
        ) : (
          invitations.map((invitation) => {
            const membership = invitation.redeemedUserId
              ? membershipByInvitation.get(
                  `${invitation.workspaceId}:${invitation.redeemedUserId}`,
                )
              : undefined;
            return (
              <article
              className="rounded-2xl border border-zinc-200 bg-white p-5"
              key={invitation.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{invitation.workspace.name}</h3>
                  <p className="text-sm text-zinc-600">{invitation.email}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {invitation.status} · expires{" "}
                    {invitation.expiresAt.toLocaleDateString("en-US")}
                  </p>
                  {membership ? (
                    <p className="mt-1 text-xs font-medium text-zinc-600">
                      {membershipAccessLabel(membership.revokedAt)}
                    </p>
                  ) : null}
                </div>
                {invitation.status === "REDEEMED" && membership ? (
                  membership.revokedAt ? (
                    <form action={restoreWorkspaceMembership}>
                      <input
                        name="invitationId"
                        type="hidden"
                        value={invitation.id}
                      />
                      <button
                        className="h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium"
                        type="submit"
                      >
                        Restore access
                      </button>
                    </form>
                  ) : (
                    <form action={revokeWorkspaceMembership}>
                      <input
                        name="invitationId"
                        type="hidden"
                        value={invitation.id}
                      />
                      <button
                        className="h-11 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700"
                        type="submit"
                      >
                        Revoke access
                      </button>
                    </form>
                  )
                ) : invitation.status !== "REDEEMED" ? (
                  <div className="flex gap-2">
                    {invitation.status === "PENDING" ? (
                      <form action={revokeWorkspaceInvitation}>
                        <input
                          name="invitationId"
                          type="hidden"
                          value={invitation.id}
                        />
                        <button
                          className="h-11 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700"
                          type="submit"
                        >
                          Revoke
                        </button>
                      </form>
                    ) : null}
                    <form action={regenerateWorkspaceInvitation}>
                      <input
                        name="invitationId"
                        type="hidden"
                        value={invitation.id}
                      />
                      <button
                        className="h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium"
                        type="submit"
                      >
                        Regenerate
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </article>
            );
          })
        )}
      </section>
    </main>
  );
}
