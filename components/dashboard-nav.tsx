"use client";

import { CircleDollarSign, Home, LogOut, Mail, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { signOut } from "@/app/logout/actions";

type NavigationItem = {
  href: string;
  icon: ComponentType<{ "aria-hidden"?: boolean; size?: number }>;
  label: string;
};

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors";

export function TopBar({
  addCheckHref,
  addPropertyHref,
  dashboardHref = "/",
  emailHref = "/email",
  ownerSignInHref,
  showLogout = false,
  isPlatformAdmin = false,
  workspaceName,
  activeHref,
  onAddProperty,
  onAddCheck,
}: {
  addCheckHref?: string;
  addPropertyHref?: string;
  dashboardHref?: string;
  emailHref?: string;
  ownerSignInHref?: string;
  showLogout?: boolean;
  isPlatformAdmin?: boolean;
  workspaceName?: string;
  activeHref?: string;
  onAddProperty?: () => void;
  onAddCheck?: () => void;
}) {
  const pathname = usePathname();
  const currentHref = activeHref ?? pathname;
  const resolvedAddPropertyHref = addPropertyHref ?? `${dashboardHref}?addProperty=1`;
  const resolvedAddCheckHref = addCheckHref ?? `${dashboardHref}?addCheck=1`;
  const items: NavigationItem[] = [
    { href: dashboardHref, icon: Home, label: "Dashboard" },
    { href: emailHref, icon: Mail, label: "Tenant emails" },
  ];
  const isActive = (href: string) =>
    currentHref === href || currentHref.startsWith(`${href}&`);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link
            className="inline-flex min-h-11 items-center font-semibold tracking-tight text-zinc-950"
            href={dashboardHref}
          >
            <span>
              Property Manager
              {workspaceName ? (
                <span className="ml-2 hidden text-xs font-normal text-zinc-500 sm:inline">
                  {workspaceName}
                </span>
              ) : null}
            </span>
          </Link>

          {ownerSignInHref ? (
            <Link
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-zinc-600 hover:text-zinc-950 md:hidden"
              href={ownerSignInHref}
            >
              Owner sign in
            </Link>
          ) : null}

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {items.map((item) => (
              <Link
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`${actionClass} ${
                  isActive(item.href)
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                }`}
                href={item.href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
            {onAddProperty ? (
              <button
                className={`${actionClass} ml-2 border border-zinc-300 text-zinc-900 hover:bg-zinc-50`}
                onClick={onAddProperty}
                type="button"
              >
                Add lease
              </button>
            ) : (
              <Link
                className={`${actionClass} ml-2 border border-zinc-300 text-zinc-900 hover:bg-zinc-50`}
                href={resolvedAddPropertyHref}
              >
                Add lease
              </Link>
            )}
            {onAddCheck ? (
              <button
                className={`${actionClass} bg-zinc-900 text-white hover:bg-zinc-800`}
                onClick={onAddCheck}
                type="button"
              >
                Record payment
              </button>
            ) : (
              <Link
                className={`${actionClass} bg-zinc-900 text-white hover:bg-zinc-800`}
                href={resolvedAddCheckHref}
              >
                Record payment
              </Link>
            )}
            {ownerSignInHref ? (
              <Link
                className={`${actionClass} ml-1 text-zinc-600 hover:text-zinc-950`}
                href={ownerSignInHref}
              >
                Owner sign in
              </Link>
            ) : null}
            {isPlatformAdmin ? (
              <Link
                className={`${actionClass} ml-1 text-blue-700 hover:bg-blue-50`}
                href="/admin"
              >
                Admin
              </Link>
            ) : null}
            {showLogout ? (
              <form action={signOut}>
                <button
                  className={`${actionClass} ml-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950`}
                  type="submit"
                >
                  Log out
                </button>
              </form>
            ) : null}
          </nav>
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className={`fixed inset-x-0 bottom-0 z-40 grid ${
          showLogout ? "grid-cols-5" : "grid-cols-4"
        } border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden`}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium ${
                active ? "text-zinc-950" : "text-zinc-500"
              }`}
              href={item.href}
              key={item.label}
            >
              <Icon aria-hidden size={20} />
              {item.label}
            </Link>
          );
        })}
        {onAddProperty ? (
          <button
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium text-zinc-500"
            onClick={onAddProperty}
            type="button"
          >
            <Plus aria-hidden size={20} />
            Add lease
          </button>
        ) : (
          <Link
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium text-zinc-500"
            href={resolvedAddPropertyHref}
          >
            <Plus aria-hidden size={20} />
            Add lease
          </Link>
        )}
        {onAddCheck ? (
          <button
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium text-zinc-500"
            onClick={onAddCheck}
            type="button"
          >
            <CircleDollarSign aria-hidden size={20} />
            Payment
          </button>
        ) : (
          <Link
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium text-zinc-500"
            href={resolvedAddCheckHref}
          >
            <CircleDollarSign aria-hidden size={20} />
            Payment
          </Link>
        )}
        {showLogout ? (
          <form action={signOut}>
            <button
              className="flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium text-zinc-500"
              type="submit"
            >
              <LogOut aria-hidden size={20} />
              Log out
            </button>
          </form>
        ) : null}
      </nav>
    </>
  );
}

export function DashboardNav({
  isPlatformAdmin,
  workspaceName,
}: {
  isPlatformAdmin: boolean;
  workspaceName: string;
}) {
  return (
    <TopBar
      isPlatformAdmin={isPlatformAdmin}
      showLogout
      workspaceName={workspaceName}
    />
  );
}
