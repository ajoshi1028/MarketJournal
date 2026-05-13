import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

// This matcher runs Clerk on every route except Next.js internals & static files
export const config = {
  matcher: [
    // Skip static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|css|js|txt)).*)",
  ],
};
