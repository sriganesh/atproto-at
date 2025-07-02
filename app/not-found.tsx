import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
          Page Not Found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          The page you're looking for doesn't exist or the AT Protocol URI is invalid.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
        <div className="pt-8 text-sm text-gray-500">
          <p>Try entering a valid AT Protocol URI like:</p>
          <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
            at://did:plc:example/app.bsky.feed.post/abc123
          </code>
        </div>
      </div>
    </div>
  );
}