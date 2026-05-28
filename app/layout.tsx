import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import NavBar from "./NavBar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

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
          colorInputBackground: "#1e1e2a",
          colorInputText: "#ffffff",
          colorPrimary: "#6366f1",
          colorText: "#e5e7eb",
          colorTextSecondary: "#9ca3af",
        },
        elements: {
          socialButtonsBlockButton: {
            backgroundColor: "#ffffff",
            color: "#1f1f1f",
            borderColor: "#dadce0",
          },
          socialButtonsBlockButtonText: {
            color: "#1f1f1f",
            fontWeight: "500",
          },
          userButtonPopoverCard: {
            backgroundColor: "#1e1e2a",
            borderColor: "#2a2a3a",
          },
          userButtonPopoverActionButton: {
            color: "#e5e7eb",
          },
          userButtonPopoverActionButtonText: {
            color: "#e5e7eb",
          },
          userButtonPopoverActionButtonIcon: {
            color: "#9ca3af",
          },
          userButtonPopoverFooter: {
            "& a": { color: "#9ca3af" },
          },
          userPreviewMainIdentifier: {
            color: "#ffffff",
          },
          userPreviewSecondaryIdentifier: {
            color: "#9ca3af",
          },
        },
      }}
    >
      <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
        <body>
          <a href="#main-content" className="skip-nav">Skip to main content</a>
          <NavBar />
          <div id="main-content" className="min-h-[calc(100vh-57px)]">{children}</div>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
