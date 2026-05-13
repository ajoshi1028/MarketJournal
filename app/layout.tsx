import Link from "next/link";
import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export const metadata = {
  title: "Market Journal",
  description: "Trading journal and portfolio tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#12121a",
          colorInputBackground: "#1a1a24",
          colorPrimary: "#6366f1",
          colorText: "#e5e7eb",
          colorTextSecondary: "#9ca3af",
        },
      }}
    >
      <html lang="en">
        <body>
          <nav className="sticky top-0 z-50 bg-surface-50/80 backdrop-blur-xl border-b border-surface-300">
            <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-3">
              <div className="flex items-center gap-8">
                <Link
                  href="/"
                  className="text-lg font-bold tracking-tight text-white"
                >
                  <span className="text-accent-light">M</span>arket
                  <span className="text-accent-light">J</span>ournal
                </Link>

                <SignedIn>
                  <div className="hidden md:flex items-center gap-1">
                    <Link href="/trades" className="nav-link">
                      Trades
                    </Link>
                    <Link href="/track" className="nav-link">
                      Track
                    </Link>
                    <Link href="/account" className="nav-link">
                      Account
                    </Link>
                    <Link href="/calculator" className="nav-link">
                      Calculator
                    </Link>
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
                </SignedIn>
              </div>
            </div>
          </nav>
          <div className="min-h-[calc(100vh-57px)]">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  );
}
