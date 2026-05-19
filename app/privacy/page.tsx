export const metadata = {
  title: "Privacy Policy — MarketJournal",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 18, 2026</p>

      <div className="prose-custom space-y-6 text-sm text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
          <p>
            When you create an account, we collect your name, email address, and authentication
            credentials through our authentication provider (Clerk). When you subscribe to a paid
            plan, payment information is processed securely by Stripe — we never store your credit
            card details on our servers.
          </p>
          <p className="mt-2">
            We also collect the trading data you voluntarily enter, including trade entries, journal
            notes, chart images, and portfolio information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>To provide and maintain the MarketJournal service</li>
            <li>To process your subscription and payments</li>
            <li>To generate AI-powered trade analysis and coaching</li>
            <li>To send important account notifications</li>
            <li>To improve our service and fix issues</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Data Storage and Security</h2>
          <p>
            Your data is stored securely in a PostgreSQL database hosted by Supabase. Chart images
            are stored in Amazon S3. All data is transmitted over HTTPS. We implement
            industry-standard security measures including authentication, rate limiting, and input
            validation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Third-Party Services</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li><strong className="text-gray-200">Clerk</strong> — authentication and user management</li>
            <li><strong className="text-gray-200">Stripe</strong> — payment processing</li>
            <li><strong className="text-gray-200">Supabase</strong> — database hosting</li>
            <li><strong className="text-gray-200">Amazon Web Services</strong> — chart image storage</li>
            <li><strong className="text-gray-200">OpenAI</strong> — AI trade analysis and coaching</li>
            <li><strong className="text-gray-200">Vercel</strong> — application hosting</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. Your trading
            data is private and only accessible to you. We share data with third-party services only
            as necessary to provide the MarketJournal service (as listed above).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. Data Retention and Deletion</h2>
          <p>
            Your data is retained for as long as your account is active. You may request deletion of
            your account and all associated data by contacting us. Upon account deletion, your data
            will be permanently removed from our systems within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">7. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. We do not use
            advertising or tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">8. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify users of any
            material changes by posting the updated policy on this page with a revised date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">9. Contact</h2>
          <p>
            If you have questions about this privacy policy or your data, contact us at{" "}
            <a href="mailto:supportmarketjournal@gmail.com" className="text-accent-light hover:text-accent">
              supportmarketjournal@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
