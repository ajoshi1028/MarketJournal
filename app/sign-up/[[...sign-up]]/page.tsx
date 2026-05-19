import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[calc(100vh-57px)]">
      <SignUp />
      <p className="mt-4 text-xs text-gray-500 text-center max-w-sm">
        By signing up, you agree to our{" "}
        <Link href="/terms" className="text-accent-light hover:text-accent underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-accent-light hover:text-accent underline">
          Privacy Policy
        </Link>.
      </p>
    </div>
  );
}
