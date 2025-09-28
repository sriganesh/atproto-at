import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - Taproot (atproto.at://)',
  description: 'Terms of Service for Taproot (atproto.at://) - AT Protocol Explorer',
};

export default function TermsOfService() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Terms of Service</h1>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Last updated: September 24, 2025</p>
        
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700 dark:text-gray-300">
              By accessing or using Taproot (atproto.at://) ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Taproot (atproto.at://) is a web-based viewer and explorer for the AT Protocol network. The Service allows users to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mt-3">
              <li>View AT Protocol content through a web interface</li>
              <li>Browse profiles, posts, and other AT Protocol records</li>
              <li>Authenticate via AT Protocol OAuth to access additional features</li>
              <li>Export repository and download blobs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Acceptable Use</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Use the Service in any way that violates applicable laws or regulations</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
              <li>Interfere with or disrupt the Service or servers hosting the Service</li>
              <li>Use automated means to access the Service without our express permission</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Content and Intellectual Property</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              The Service displays content from the AT Protocol network:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>All content displayed belongs to the respective content creators</li>
              <li>We do not claim ownership of any user-generated content</li>
              <li>The Service interface and code are open source</li>
              <li>You must respect the intellectual property rights of content creators</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Privacy and Data</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Your use of the Service is subject to our Privacy Policy. By using the Service, 
              you consent to our practices described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. OAuth Authentication</h2>
            <p className="text-gray-700 dark:text-gray-300">
              If you choose to authenticate using AT Protocol OAuth:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mt-3">
              <li>You authorize the Service to access your AT Protocol account</li>
              <li>You can revoke this access at any time</li>
              <li>Authentication is handled by your AT Protocol provider</li>
              <li>We only request minimal necessary permissions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Disclaimers and Limitations</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>We make no warranties about the accuracy or reliability of content</li>
              <li>We do not guarantee uninterrupted or error-free service</li>
              <li>We are not responsible for content posted by users on the AT Protocol network</li>
              <li>Use of the Service is at your own risk</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Limitation of Liability</h2>
            <p className="text-gray-700 dark:text-gray-300">
              To the maximum extent permitted by law, we shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, or any loss of profits or 
              revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, 
              or other intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Indemnification</h2>
            <p className="text-gray-700 dark:text-gray-300">
              You agree to indemnify and hold harmless Taproot (atproto.at://) and its operators from any claims, 
              damages, losses, liabilities, costs, and expenses arising from your use of the Service 
              or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Changes to Terms</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We reserve the right to modify these Terms at any time. Changes will be effective 
              immediately upon posting to this page. Your continued use of the Service after any 
              changes indicates your acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Termination</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We may terminate or suspend access to the Service immediately, without prior notice, 
              for any reason, including breach of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Governing Law</h2>
            <p className="text-gray-700 dark:text-gray-300">
              These Terms shall be governed by the laws of the jurisdiction in which the Service 
              operates, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">13. Contact Information</h2>
            <p className="text-gray-700 dark:text-gray-300">
              For questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-2">
              <a href="https://bsky.app/profile/atproto.at" target="_blank" rel="noopener noreferrer" 
              className="text-blue-500 hover:underline">@atproto.at on Bluesky</a>
            </p>
          </section>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <a href="/" className="text-blue-500 hover:underline">← Back to Home</a>
        </div>
      </div>
    </main>
  );
}