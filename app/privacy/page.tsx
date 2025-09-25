import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Taproot (atproto.at://)',
  description: 'Privacy policy for Taproot (atproto.at://) - AT Protocol Explorer',
};

export default function PrivacyPolicy() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Privacy Policy</h1>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Last updated: September 24, 2025</p>
        
        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">Overview</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Taproot (atproto.at://) ("we", "our", or "the Service") is committed to protecting your privacy. 
              This Privacy Policy explains how we handle information when you use our AT Protocol explorer service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Information We Don't Collect</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We are designed with privacy in mind:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>No personal data is stored on our servers</li>
              <li>No analytics or tracking cookies</li>
              <li>No advertising or marketing data collection</li>
              <li>No user behavior tracking</li>
              <li>No data sharing with third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">OAuth Authentication</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              When you sign in using AT Protocol OAuth:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Authentication tokens are stored only in your browser's local storage</li>
              <li>Sessions are temporary and exist only while you use the service</li>
              <li>No authentication data is transmitted to or stored on our servers</li>
              <li>You can revoke access at any time through your AT Protocol provider</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">AT Protocol Data</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              When viewing AT Protocol content:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Data is fetched directly from AT Protocol Personal Data Servers (PDS)</li>
              <li>We act only as a viewer/interface for publicly available AT Protocol data</li>
              <li>No AT Protocol content is cached or stored by our service</li>
              <li>Content permissions are determined by the AT Protocol network</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Third-Party Services</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We use minimal third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>Cloudflare Pages:</strong> For hosting and content delivery. Cloudflare may collect 
              basic access logs (IP addresses, user agents) for security and performance purposes. 
              See <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" 
              className="text-blue-500 hover:underline">Cloudflare's Privacy Policy</a></li>
              <li><strong>AT Protocol Network:</strong> For accessing decentralized social data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Your Rights</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>Access the service without providing personal information</li>
              <li>Use the service without creating an account</li>
              <li>Revoke OAuth access at any time</li>
              <li>Clear your browser data to remove any local session information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Data Security</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Since we don't collect or store personal data, there is minimal security risk. However, 
              we implement standard web security practices including HTTPS encryption for all connections.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Children's Privacy</h2>
            <p className="text-gray-700 dark:text-gray-300">
              Our service does not knowingly collect any information from children under 13. 
              The service is designed to be used without providing any personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Changes to This Policy</h2>
            <p className="text-gray-700 dark:text-gray-300">
              We may update this Privacy Policy from time to time. Changes will be posted on this page 
              with an updated "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">Contact</h2>
            <p className="text-gray-700 dark:text-gray-300">
              If you have questions about this Privacy Policy, you can contact us at:
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