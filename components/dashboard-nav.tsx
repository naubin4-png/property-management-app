"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/email", label: "Email" },
];

export function DashboardNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link className="font-semibold tracking-tight text-zinc-950" href="/">
          Property Manager
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-2 md:flex"
        >
          {navigation.map((item) => (
            <Link
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className="ml-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            href="/properties/new"
          >
            + Add Property
          </Link>
          <button
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            type="button"
          >
            Log Payment
          </button>
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
          {navigation.map((item) => (
            <Link
              className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              href={item.href}
              key={item.href}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className="block rounded-md border border-zinc-300 px-3 py-2 text-center text-sm font-medium text-zinc-900"
            href="/properties/new"
            onClick={() => setIsOpen(false)}
          >
            + Add Property
          </Link>
          <button
            className="block w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
            type="button"
          >
            Log Payment
          </button>
        </nav>
      ) : null}
    </header>
  );
}
