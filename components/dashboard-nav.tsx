"use client";

import { CircleDollarSign, Home, Mail, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

type NavigationItem = {
  href: string;
  icon: ComponentType<{ "aria-hidden"?: boolean; size?: number }>;
  label: string;
};

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors";

export function TopBar({
  dashboardHref = "/",
  emailHref = "/email",
  ownerSignInHref,
  onAddProperty,
  onLogPayment,
}: {
  dashboardHref?: string;
  emailHref?: string;
  ownerSignInHref?: string;
  onAddProperty?: () => void;
  onLogPayment?: () => void;
}) {
  const pathname = usePathname();
  const items: NavigationItem[] = [
    { href: dashboardHref, icon: Home, label: "Dashboard" },
    { href: emailHref, icon: Mail, label: "Email" },
  ];

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link
            className="inline-flex min-h-11 items-center font-semibold tracking-tight text-zinc-950"
            href={dashboardHref}
          >
            Property Manager
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
                aria-current={pathname === item.href ? "page" : undefined}
                className={`${actionClass} ${
                  pathname === item.href
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
                + Add Property
              </button>
            ) : (
              <Link
                className={`${actionClass} ml-2 border border-zinc-300 text-zinc-900 hover:bg-zinc-50`}
                href="/?addProperty=1"
              >
                + Add Property
              </Link>
            )}
            {onLogPayment ? (
              <button
                className={`${actionClass} bg-zinc-900 text-white hover:bg-zinc-800`}
                onClick={onLogPayment}
                type="button"
              >
                Log Payment
              </button>
            ) : (
              <Link
                className={`${actionClass} bg-zinc-900 text-white hover:bg-zinc-800`}
                href="/?logPayment=1"
              >
                Log Payment
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
          </nav>
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-zinc-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
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
            Add
          </button>
        ) : (
          <Link
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium text-zinc-500"
            href="/?addProperty=1"
          >
            <Plus aria-hidden size={20} />
            Add
          </Link>
        )}
        {onLogPayment ? (
          <button
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium text-zinc-500"
            onClick={onLogPayment}
            type="button"
          >
            <CircleDollarSign aria-hidden size={20} />
            Payment
          </button>
        ) : (
          <Link
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium text-zinc-500"
            href="/?logPayment=1"
          >
            <CircleDollarSign aria-hidden size={20} />
            Payment
          </Link>
        )}
      </nav>
    </>
  );
}

export function DashboardNav() {
  return <TopBar />;
}
