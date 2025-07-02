interface RepositoryStatusWarningsProps {
  data: any;
}

export default function RepositoryStatusWarnings({ data }: RepositoryStatusWarningsProps) {
  // Check if the repository is taken down, deactivated, or otherwise unavailable
  const isTakendown = data.type === 'profile' && data.data?.takendown === true;
  const isDeactivated = data.type === 'profile' && data.data?.deactivated === true;
  const isUnavailable = data.type === 'profile' && data.data?.unavailable === true && !isTakendown && !isDeactivated;

  if (!isTakendown && !isDeactivated && !isUnavailable) {
    return null;
  }

  return (
    <>
      {/* Show repository unavailable warnings based on type */}
      {isTakendown && (
        <div className="mt-2 bg-yellow-100 dark:bg-yellow-800 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded">
          <div className="flex items-start">
            <svg className="h-5 w-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Repository has been taken down</p>
              <p className="text-sm mt-1">{data.data?.repoInfo?.takendownMessage || data.data?.unavailableMessage || "This repository is not accessible."}</p>
            </div>
          </div>
        </div>
      )}

      {/* Show deactivated repository warning */}
      {isDeactivated && (
        <div className="mt-2 bg-blue-100 dark:bg-blue-800 border border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-200 px-4 py-3 rounded">
          <div className="flex items-start">
            <svg className="h-5 w-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Account has been deactivated</p>
              <p className="text-sm mt-1">{data.data?.repoInfo?.deactivatedMessage || data.data?.unavailableMessage || "This account has been deactivated by the user."}</p>
            </div>
          </div>
        </div>
      )}

      {/* Show generic unavailable repository warning */}
      {isUnavailable && (
        <div className="mt-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded">
          <div className="flex items-start">
            <svg className="h-5 w-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Repository unavailable</p>
              <p className="text-sm mt-1">{data.data?.repoInfo?.unavailableMessage || data.data?.unavailableMessage || "This repository information is currently unavailable."}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 