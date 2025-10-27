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
    <ClerkProvider>
      <html lang="en">
        <body>
          <nav className="bg-gray-100 border-b p-4">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <ul className="flex space-x-6">
                <li>
                  <Link
                    href="/"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Home
                  </Link>
                </li>
                <SignedIn>
                  <li>
                    <Link
                      href="/trades"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Trades
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/track"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Track
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/account"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      My Account
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/calculator"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Risk Calculator
                    </Link>
                  </li>
                </SignedIn>
              </ul>

              <div className="flex items-center space-x-4">
                <SignedOut>
                  <Link
                    href="/sign-in"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Sign Up
                  </Link>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </div>
          </nav>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
