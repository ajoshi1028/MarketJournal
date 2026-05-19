export const metadata = {
  title: "Terms of Service — MarketJournal",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: May 18, 2026</p>

      <div className="prose-custom space-y-6 text-sm text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using MarketJournal (&quot;the Service&quot;), you agree to be bound by
            these Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. Description of Service</h2>
          <p>
            MarketJournal is a trade journaling and analytics platform that helps traders log trades,
            analyze performance, and receive AI-powered coaching. The Service includes free and paid
            subscription tiers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Account Registration</h2>
          <p>
            You must create an account to use the Service. You are responsible for maintaining the
            confidentiality of your account credentials and for all activity that occurs under your
            account. You agree to provide accurate and complete information during registration.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Free and Paid Plans</h2>
          <p>
            Free accounts include limited access to AI-powered features (10 AI chart analyses, 10 AI
            coaching reports, and 10 AI trade analyses). Pro subscriptions provide unlimited access to
            all AI features and are billed monthly through Stripe. You may cancel your subscription at
            any time from your account settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Payments and Refunds</h2>
          <p>
            Pro subscriptions are billed on a recurring monthly basis. All payments are processed
            securely by Stripe. Refund requests may be made within 7 days of a billing charge by
            contacting us. We reserve the right to deny refund requests made after this period.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. User Content</h2>
          <p>
            You retain ownership of all data you enter into the Service, including trade entries,
            journal notes, and chart images. By using the Service, you grant us a limited license to
            process your data solely for the purpose of providing the Service (e.g., generating
            analytics and AI analysis). We will not share, sell, or use your data for any other purpose.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the Service</li>
            <li>Interfere with or disrupt the Service or its infrastructure</li>
            <li>Reverse-engineer, decompile, or disassemble the Service</li>
            <li>Use automated tools to scrape or extract data from the Service</li>
            <li>Resell or redistribute access to the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">8. AI-Generated Content</h2>
          <p>
            The AI coaching and analysis features are provided for informational and educational
            purposes only. AI-generated insights do not constitute financial advice. You should not
            rely solely on AI analysis for trading decisions. MarketJournal is not a registered
            investment advisor and assumes no liability for trading losses.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">9. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
            of any kind, either express or implied. We do not guarantee that the Service will be
            uninterrupted, error-free, or free of harmful components. We make no warranties regarding
            the accuracy or reliability of any AI-generated content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, MarketJournal and its operators shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of profits, trading losses, data loss, or other
            intangible losses arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">11. Account Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account if you violate these Terms of
            Service. You may delete your account at any time by contacting us. Upon termination, your
            data will be permanently removed from our systems within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">12. Changes to Terms</h2>
          <p>
            We may update these Terms of Service from time to time. We will notify users of material
            changes by posting the updated terms on this page with a revised date. Continued use of
            the Service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">13. Contact</h2>
          <p>
            If you have questions about these terms, contact us at{" "}
            <a href="mailto:supportmarketjournal@gmail.com" className="text-accent-light hover:text-accent">
              supportmarketjournal@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
