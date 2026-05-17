import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import NavBar from "./NavBar";

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
        },
      }}
    >
      <html lang="en">
        <body>
          <NavBar />
          <div className="min-h-[calc(100vh-57px)]">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  );
}
