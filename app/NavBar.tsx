"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "/trades", label: "Trades" },
  { href: "/track", label: "Track" },
  { href: "/analytics", label: "Analytics" },
  { href: "/journal", label: "Journal" },
  { href: "/coaching", label: "Coaching" },
  { href: "/billing", label: "Billing" },
];

const TOOLS_LINKS = [
  { href: "/replay", label: "Trade Replay", desc: "Review trades with live charts" },
  { href: "/calculator", label: "Risk Calculator", desc: "Position sizing & risk-reward" },
  { href: "/reports", label: "PDF Reports", desc: "Generate downloadable reports" },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isToolsActive = TOOLS_LINKS.some((l) => pathname === l.href);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setToolsOpen(false);
    setOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 bg-surface-50/80 backdrop-blur-xl border-b border-surface-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 shrink-0"
            aria-label="MarketJournal home"
          >
            <svg viewBox="0 0 32 32" className="w-7 h-7" aria-hidden="true">
              <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7" fill="#0a0a0f" stroke="#818cf8" strokeWidth="1.5" />
              <text x="16" y="17.5" textAnchor="middle" fontFamily="ui-monospace,SFMono-Regular,Menlo,monospace" fontWeight="700" fontSize="13">
                <tspan fill="#ffffff">M</tspan><tspan fill="#818cf8">J</tspan>
              </text>
              <polyline points="8,26 12,24 16,25 20,22 24,23.5" fill="none" stroke="#34d399" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-base font-semibold tracking-tight text-white">
              <span className="text-accent-light">M</span>arket
              <span className="text-accent-light">J</span>ournal
            </span>
          </Link>

          <SignedIn>
            <div className="hidden lg:flex items-center gap-0.5">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`nav-link font-mono text-xs uppercase tracking-wider ${
                    pathname === l.href ? "text-accent-light" : ""
                  }`}
                >
                  {l.label}
                </Link>
              ))}

              {/* Tools dropdown */}
              <div ref={toolsRef} className="relative">
                <button
                  onClick={() => setToolsOpen(!toolsOpen)}
                  className={`nav-link font-mono text-xs uppercase tracking-wider inline-flex items-center gap-1 ${
                    isToolsActive ? "text-accent-light" : ""
                  }`}
                  aria-expanded={toolsOpen}
                  aria-haspopup="true"
                >
                  Tools
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {toolsOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-surface-100 border border-surface-300 shadow-xl shadow-black/30 py-1.5 z-50">
                    {TOOLS_LINKS.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`block px-4 py-2.5 transition-colors hover:bg-surface-200 ${
                          pathname === l.href ? "bg-surface-200" : ""
                        }`}
                      >
                        <span className={`text-sm font-medium ${pathname === l.href ? "text-accent-light" : "text-white"}`}>
                          {l.label}
                        </span>
                        <span className="block text-xs text-gray-500 mt-0.5">{l.desc}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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
              aria-label="Toggle navigation menu"
              aria-expanded={open}
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
                  className={`px-3 py-2.5 text-sm transition-colors ${
                    pathname === l.href
                      ? "bg-accent/15 text-accent-light"
                      : "text-gray-400 hover:bg-surface-200 hover:text-gray-200"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              {/* Tools section in mobile */}
              <div className="col-span-2 mt-2 pt-2 border-t border-surface-300">
                <p className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">Tools</p>
                {TOOLS_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`px-3 py-2.5 text-sm transition-colors block ${
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
          </div>
        )}
      </SignedIn>
    </nav>
  );
}
