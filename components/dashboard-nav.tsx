"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/email", label: "Email" },
];

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
  const [isOpen, setIsOpen] = useState(false);
  const items = [
    { href: dashboardHref, label: navigation[0].label },
    { href: emailHref, label: navigation[1].label },
  ];

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          className="font-semibold tracking-tight text-zinc-950"
          href={dashboardHref}
        >
          Property Manager
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-2 md:flex"
        >
          {items.map((item) => (
            <Link
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
          {onAddProperty ? (
            <button
              className="ml-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              onClick={onAddProperty}
              type="button"
            >
              + Add Property
            </button>
          ) : (
            <Link
              className="ml-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              href="/?addProperty=1"
            >
              + Add Property
            </Link>
          )}
          {onLogPayment ? (
            <button
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              onClick={onLogPayment}
              type="button"
            >
              Log Payment
            </button>
          ) : (
            <Link
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              href="/?logPayment=1"
            >
              Log Payment
            </Link>
          )}
          {ownerSignInHref ? (
            <Link
              className="ml-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
              href={ownerSignInHref}
            >
              Owner sign in
            </Link>
          ) : null}
        </nav>

        <button
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
          className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100 md:hidden"
          onClick={() => setIsOpen((open) => !open)}
          type="button"
        >
          {isOpen ? (
            <X aria-hidden="true" size={20} />
          ) : (
            <Menu aria-hidden="true" size={20} />
          )}
        </button>
      </div>

      {isOpen ? (
        <nav
          aria-label="Mobile navigation"
          className="space-y-1 border-t border-zinc-200 px-4 py-4 md:hidden"
        >
          {items.map((item) => (
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              href={item.href}
              key={item.label}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {onAddProperty ? (
            <button
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-900"
              onClick={() => {
                onAddProperty();
                setIsOpen(false);
              }}
              type="button"
            >
              + Add Property
            </button>
          ) : (
            <Link
              className="block rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-900"
              href="/?addProperty=1"
              onClick={() => setIsOpen(false)}
            >
              + Add Property
            </Link>
          )}
          {onLogPayment ? (
            <button
              className="block w-full rounded-md bg-zinc-900 px-3 py-2 text-left text-sm font-medium text-white"
              onClick={() => {
                onLogPayment();
                setIsOpen(false);
              }}
              type="button"
            >
              Log Payment
            </button>
          ) : (
            <Link
              className="block w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
              href="/?logPayment=1"
              onClick={() => setIsOpen(false)}
            >
              Log Payment
            </Link>
          )}
          {ownerSignInHref ? (
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-800"
              href={ownerSignInHref}
            >
              Owner sign in
            </Link>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}

export function DashboardNav() {
  return <TopBar />;
}
