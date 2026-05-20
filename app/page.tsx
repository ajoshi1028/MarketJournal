import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

const features = [
  {
    title: "AI Trade Analysis",
    desc: "Upload your chart and get instant AI-powered analysis of your entries, exits, and what you could improve.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    title: "Smart Trade Journal",
    desc: "Log every trade with option type, strike, entry/exit times, and chart snapshots. All in one place.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    title: "Performance Analytics",
    desc: "Win rate, P&L by strategy, best tickers, weekday patterns — see exactly where you make and lose money.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "AI Trading Coach",
    desc: "Get personalized weekly coaching based on your patterns. Strengths, weaknesses, and action items.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
      </svg>
    ),
  },
  {
    title: "Trade Replay",
    desc: "Replay past trades with your chart snapshots side-by-side with live TradingView charts.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
      </svg>
    ),
  },
  {
    title: "Risk Calculator",
    desc: "Calculate position sizes, max loss, and reward-to-risk ratios before entering any trade.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
  },
];

const steps = [
  { num: "1", title: "Log Your Trade", desc: "Enter your ticker, option contract, fills, and upload a chart screenshot." },
  { num: "2", title: "Get AI Analysis", desc: "Our AI analyzes your chart, entry timing, and trade structure instantly." },
  { num: "3", title: "Track & Improve", desc: "Review analytics, spot patterns, and get personalized coaching to level up." },
];

export default function HomePage() {
  return (
    <main>
      <SignedOut>
        {/* Hero */}
        <section className="relative">
          <div className="max-w-5xl mx-auto px-6 pt-20 pb-24">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-accent-light text-sm font-medium tracking-wide uppercase mb-6">
                AI-Powered Trading Journal
              </p>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-5 leading-[1.15]">
                Trade smarter.{" "}
                <span className="text-accent-light">Win more.</span>
              </h1>
              <p className="text-lg text-gray-400 mb-10 leading-relaxed">
                The options trading journal that analyzes your charts, coaches your strategy, and helps you find your edge.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link href="/sign-up" className="btn-primary px-8 py-3">
                  Start Free
                </Link>
                <Link
                  href="/sign-in"
                  className="border border-surface-400 text-gray-300 hover:bg-surface-200 px-8 py-3 rounded-lg text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
              </div>
              <p className="text-gray-600 text-xs mt-5">
                Free to use. No credit card required. By signing up, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-gray-400">Terms</Link> and{" "}
                <Link href="/privacy" className="underline hover:text-gray-400">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-y border-surface-300 bg-surface-50">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="grid grid-cols-3 gap-8 text-center">
              {[
                { val: "AI", label: "Analysis & Coaching" },
                { val: "10+", label: "Analytics Metrics" },
                { val: "Free", label: "To Get Started" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-semibold text-white">{s.val}</p>
                  <p className="text-gray-500 text-sm mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-3xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">
              Everything you need to trade better
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Built by traders, for traders. Every feature designed to help you find and keep your edge.
            </p>
          </div>
          <div className="space-y-6">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 text-accent-light mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-surface-50 border-y border-surface-300">
          <div className="max-w-5xl mx-auto px-6 py-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">
                How it works
              </h2>
              <p className="text-gray-400">Three steps to becoming a better trader.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((s) => (
                <div key={s.num} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-sm font-semibold text-accent-light">{s.num}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">Simple pricing</h2>
            <p className="text-gray-400">Start free, upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {/* Free */}
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-white mb-0.5">Free</h3>
              <p className="text-gray-500 text-xs mb-4">Perfect for getting started</p>
              <p className="text-3xl font-semibold text-white mb-5">
                $0<span className="text-sm text-gray-500 font-normal">/mo</span>
              </p>
              <ul className="space-y-2.5 mb-6">
                {["10 AI chart analyses", "10 AI coaching reports", "Basic analytics", "Risk calculator", "Daily journal"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 text-profit flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="block text-center border border-surface-400 text-gray-300 hover:bg-surface-200 px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                Get Started
              </Link>
            </div>
            {/* Pro */}
            <div className="card p-6 border-accent/30">
              <h3 className="text-sm font-semibold text-white mb-0.5">Pro</h3>
              <p className="text-gray-500 text-xs mb-4">For serious traders</p>
              <p className="text-3xl font-semibold text-white mb-5">
                $19<span className="text-sm text-gray-500 font-normal">/mo</span>
              </p>
              <ul className="space-y-2.5 mb-6">
                {[
                  "Unlimited trades",
                  "Unlimited AI chart analysis",
                  "Unlimited AI coaching",
                  "Advanced analytics",
                  "PDF reports",
                  "Trade replay",
                  "CSV broker import",
                  "Priority support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 text-accent-light flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up" className="btn-primary block text-center py-2">
                Upgrade
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-surface-300">
          <div className="max-w-5xl mx-auto px-6 py-20 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">
              Join now
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Join traders who use MarketJournal to track, analyze, and improve their trading performance.
            </p>
            <Link href="/sign-up" className="btn-primary px-8 py-3">
              Get Started Free
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-surface-300 py-8">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-xs">MarketJournal</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <Link href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gray-400 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </SignedOut>

      <SignedIn>
        <Dashboard />
      </SignedIn>
    </main>
  );
}
