import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <SignedOut>
        <div className="text-center mb-20 pt-8">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Trade Smarter.{" "}
            <span className="text-accent-light">Track Everything.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Your comprehensive trading journal and portfolio tracker. Record
            trades, analyze performance, and manage risk with powerful tools.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up" className="btn-primary text-lg px-8 py-3">
              Get Started Free
            </Link>
            <Link
              href="/sign-in"
              className="border border-surface-400 text-gray-300 hover:bg-surface-200 px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {[
            {
              icon: (
                <svg className="w-7 h-7 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
              title: "Trading Journal",
              desc: "Record and analyze your trading activity with detailed performance metrics.",
            },
            {
              icon: (
                <svg className="w-7 h-7 text-profit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              ),
              title: "Portfolio Tracking",
              desc: "Track your account growth with real-time P&L charts and analytics.",
            },
            {
              icon: (
                <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                </svg>
              ),
              title: "Risk Calculator",
              desc: "Calculate optimal position sizes and manage risk effectively.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="card p-6 hover:border-surface-400 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-surface-200 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center card p-10 border-accent/20">
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to Start Trading Smarter?
          </h2>
          <p className="text-gray-400 mb-6">
            Join traders who use Market Journal to improve their performance.
          </p>
          <Link href="/sign-up" className="btn-primary text-lg px-8 py-3">
            Create Your Free Account
          </Link>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            Track your trades and manage your portfolio.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <Link
            href="/trades"
            className="card p-6 group hover:border-accent/40 hover:shadow-glow transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
              <svg className="w-5 h-5 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">
              Trading Journal
            </h2>
            <p className="text-gray-500 text-sm">
              Record and analyze your trading activity
            </p>
          </Link>

          <Link
            href="/account"
            className="card p-6 group hover:border-profit/40 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-profit/10 flex items-center justify-center mb-4 group-hover:bg-profit/20 transition-colors">
              <svg className="w-5 h-5 text-profit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">
              My Account
            </h2>
            <p className="text-gray-500 text-sm">
              Portfolio analytics and growth tracking
            </p>
          </Link>

          <Link
            href="/calculator"
            className="card p-6 group hover:border-amber-500/40 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">
              Risk Calculator
            </h2>
            <p className="text-gray-500 text-sm">
              Calculate optimal position sizes
            </p>
          </Link>
        </div>
      </SignedIn>
    </main>
  );
}
