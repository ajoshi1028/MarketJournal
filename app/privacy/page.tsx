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
          <p className="mt-2">
            We automatically collect certain technical information when you use the Service, including
            IP address, browser type, device type, operating system, and usage patterns (pages
            visited, features used, timestamps). This data is used solely for service operation and
            improvement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>To provide and maintain the MarketJournal service</li>
            <li>To process your subscription and payments</li>
            <li>To generate AI-powered trade analysis and coaching</li>
            <li>To send important account notifications</li>
            <li>To improve our service, fix issues, and prevent abuse</li>
            <li>To enforce our Terms of Service and protect against fraud</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p className="mt-2">
            We do not use your personal information for advertising purposes. We do not build
            advertising profiles based on your trading data or activity.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. AI Data Processing</h2>
          <p>
            When you use AI-powered features (chart analysis, trade analysis, coaching), your relevant
            trading data and chart images are sent to OpenAI for processing. This data is sent solely
            to generate your requested analysis and is subject to OpenAI&apos;s data usage policies. We
            do not use your trading data to train AI models. You can choose not to use AI features, in
            which case your data will not be sent to OpenAI.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Data Storage and Security</h2>
          <p>
            Your data is stored securely in a PostgreSQL database hosted by Supabase. Chart images
            are stored in Amazon S3. All data is transmitted over HTTPS using TLS encryption. We
            implement industry-standard security measures including authentication, rate limiting,
            input validation, and access controls.
          </p>
          <p className="mt-2">
            While we take reasonable measures to protect your data, no method of transmission over the
            Internet or electronic storage is 100% secure. We cannot guarantee absolute security of
            your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Third-Party Services</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li><strong className="text-gray-200">Clerk</strong> — authentication and user management</li>
            <li><strong className="text-gray-200">Stripe</strong> — payment processing</li>
            <li><strong className="text-gray-200">Supabase</strong> — database hosting</li>
            <li><strong className="text-gray-200">Amazon Web Services</strong> — chart image storage</li>
            <li><strong className="text-gray-200">OpenAI</strong> — AI trade analysis and coaching</li>
            <li><strong className="text-gray-200">Vercel</strong> — application hosting and analytics</li>
          </ul>
          <p className="mt-2">
            Each third-party service has its own privacy policy governing its use of your data. We
            encourage you to review their respective policies. We are not responsible for the privacy
            practices of these third-party services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. Your trading
            data is private and only accessible to you. We share data with third-party services only
            as necessary to provide the MarketJournal service (as listed above).
          </p>
          <p className="mt-2">
            We may disclose your information if required to do so by law, court order, or government
            request, or if we believe in good faith that disclosure is necessary to: (a) comply with
            legal obligations; (b) protect our rights or property; (c) prevent fraud or abuse; or
            (d) protect the safety of our users or the public.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">7. Data Retention and Deletion</h2>
          <p>
            Your data is retained for as long as your account is active. You may request deletion of
            your account and all associated data by contacting us at{" "}
            <a href="mailto:supportmarketjournal@gmail.com" className="text-accent-light hover:text-accent">
              supportmarketjournal@gmail.com
            </a>. Upon account deletion, your data will be permanently removed from our systems within
            30 days. Some data may be retained longer if required by law or for legitimate business
            purposes (e.g., billing records, fraud prevention).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">8. Cookies</h2>
          <p>
            We use essential cookies for authentication and session management. We do not use
            advertising or tracking cookies. Third-party services integrated into our platform may set
            their own cookies as described in their respective privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">9. Your Rights — California Residents (CCPA)</h2>
          <p>
            If you are a California resident, you have the following rights under the California
            Consumer Privacy Act (CCPA):
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li><strong className="text-gray-200">Right to Know</strong> — You may request details about the personal information we collect, use, and disclose.</li>
            <li><strong className="text-gray-200">Right to Delete</strong> — You may request deletion of your personal information, subject to certain exceptions.</li>
            <li><strong className="text-gray-200">Right to Opt-Out</strong> — We do not sell your personal information. If this changes, we will provide an opt-out mechanism.</li>
            <li><strong className="text-gray-200">Right to Non-Discrimination</strong> — We will not discriminate against you for exercising your privacy rights.</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{" "}
            <a href="mailto:supportmarketjournal@gmail.com" className="text-accent-light hover:text-accent">
              supportmarketjournal@gmail.com
            </a>. We will respond to verifiable requests within 45 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">10. Your Rights — EEA/UK Residents (GDPR)</h2>
          <p>
            If you are located in the European Economic Area or the United Kingdom, you have the
            following rights under the General Data Protection Regulation (GDPR):
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li><strong className="text-gray-200">Access</strong> — Request a copy of the personal data we hold about you.</li>
            <li><strong className="text-gray-200">Rectification</strong> — Request correction of inaccurate or incomplete data.</li>
            <li><strong className="text-gray-200">Erasure</strong> — Request deletion of your personal data.</li>
            <li><strong className="text-gray-200">Restriction</strong> — Request restriction of processing of your data.</li>
            <li><strong className="text-gray-200">Portability</strong> — Request your data in a structured, machine-readable format.</li>
            <li><strong className="text-gray-200">Objection</strong> — Object to processing of your personal data.</li>
          </ul>
          <p className="mt-2">
            Our legal basis for processing your data is: (a) performance of a contract (providing the
            Service); (b) your consent (AI features, optional data); and (c) legitimate interests
            (security, fraud prevention, service improvement). To exercise your rights or lodge a
            complaint, contact us at{" "}
            <a href="mailto:supportmarketjournal@gmail.com" className="text-accent-light hover:text-accent">
              supportmarketjournal@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">11. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for individuals under the age of 18. We do not knowingly
            collect personal information from minors. If we become aware that we have collected data
            from a person under 18, we will take steps to delete that information promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">12. International Data Transfers</h2>
          <p>
            Your data may be transferred to and processed in the United States and other countries
            where our service providers operate. By using the Service, you consent to the transfer of
            your data to countries that may have different data protection laws than your country of
            residence.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">13. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify users of any
            material changes by posting the updated policy on this page with a revised date. Your
            continued use of the Service after changes are posted constitutes acceptance of the updated
            policy. We encourage you to review this page periodically.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">14. Contact</h2>
          <p>
            If you have questions about this privacy policy, your data, or wish to exercise your
            privacy rights, contact us at{" "}
            <a href="mailto:supportmarketjournal@gmail.com" className="text-accent-light hover:text-accent">
              supportmarketjournal@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
