interface FallbackMessageProps {
  data: any;
}

export default function FallbackMessage({ data }: FallbackMessageProps) {
  if (!data.fallback) {
    return null;
  }

  return (
    <div className="mb-6 bg-orange-100 dark:bg-orange-900/20 border border-orange-400 dark:border-orange-600 text-orange-700 dark:text-orange-300 px-4 py-3 rounded">
      <div className="flex items-start">
        <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <p className="font-medium">Record Not Found - Showing Available Data</p>
          <p className="text-sm mt-1">{data.fallback.message}</p>
          <div className="mt-2 text-xs">
            <p><strong>Attempted:</strong> <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">{data.fallback.attemptedUri}</code></p>
            {data.fallback.attemptedCollectionUri && (
              <p className="mt-1"><strong>Also tried:</strong> <code className="bg-orange-200 dark:bg-orange-800 px-1 rounded">{data.fallback.attemptedCollectionUri}</code></p>
            )}
            <p className="mt-1"><strong>Error:</strong> {data.fallback.error}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 