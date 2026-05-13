"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "/trades", label: "Trades" },
  { href: "/track", label: "Track" },
  { href: "/analytics", label: "Analytics" },
  { href: "/journal", label: "Journal" },
  { href: "/coaching", label: "Coaching" },
  { href: "/replay", label: "Replay" },
  { href: "/reports", label: "Reports" },
  { href: "/calculator", label: "Calculator" },
  { href: "/sync", label: "Sync" },
  { href: "/billing", label: "Billing" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-surface-50/80 backdrop-blur-xl border-b border-surface-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-white shrink-0"
          >
            <span className="text-accent-light">M</span>arket
            <span className="text-accent-light">J</span>ournal
          </Link>

          <SignedIn>
            <div className="hidden lg:flex items-center gap-0.5">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav-link text-sm ${
                    pathname === l.href ? "text-accent-light" : ""
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </SignedIn>
        </div>

        <div className="flex items-center gap-3">
          <SignedOut>
            <Link href="/sign-in" className="nav-link text-sm">
              Sign In
            </Link>
            <Link href="/sign-up" className="btn-primary text-sm">
              Get Started
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 ring-2 ring-surface-400",
                },
              }}
            />
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {open ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </SignedIn>
        </div>
      </div>

      {/* Mobile menu */}
      <SignedIn>
        {open && (
          <div className="lg:hidden border-t border-surface-300 bg-surface-50/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    pathname === l.href
                      ? "bg-accent/15 text-accent-light"
                      : "text-gray-400 hover:bg-surface-200 hover:text-gray-200"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </SignedIn>
    </nav>
  );
}
