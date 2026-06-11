"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";

export function PropertyPanel({
  children,
  closeHref,
  onClose,
  title,
}: {
  children: ReactNode;
  closeHref: string;
  onClose?: () => void;
  title: string;
}) {
  const router = useRouter();
  const closeRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (onClose) {
        onClose();
      } else {
        router.replace(closeHref);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocusRef.current?.focus();
    };
  }, [closeHref, onClose, router]);

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (onClose) {
      onClose();
    } else {
      router.push(closeHref);
    }
  }

  const closeClass =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-zinc-500 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400";

  return (
    <div
      aria-label={`${title} details`}
      aria-modal="true"
      className="fixed inset-0 z-40 flex justify-end bg-black/35"
      onMouseDown={closeFromBackdrop}
      role="dialog"
    >
      <aside className="flex h-full w-full flex-col bg-zinc-50 shadow-2xl sm:max-w-2xl">
        <div className="flex min-h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6">
          <p className="truncate pr-4 text-sm font-medium text-zinc-600">{title}</p>
          {onClose ? (
            <button
              aria-label="Close details"
              className={closeClass}
              onClick={onClose}
              ref={closeRef as React.RefObject<HTMLButtonElement>}
              type="button"
            >
              ×
            </button>
          ) : (
            <Link
              aria-label="Close details"
              className={closeClass}
              href={closeHref}
              ref={closeRef as React.RefObject<HTMLAnchorElement>}
            >
              ×
            </Link>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </aside>
    </div>
  );
}
