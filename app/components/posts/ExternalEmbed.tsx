import React from 'react';

type ExternalData = {
  uri: string;
  title?: string;
  description?: string;
  thumb?: {
    ref: {
      $link: string;
    };
    mimeType: string;
    size?: number;
  };
};

type ExternalEmbedProps = {
  external: ExternalData;
  authorDid?: string;
  hideLink?: boolean;
};

export default function ExternalEmbed({ external, authorDid, hideLink = false }: ExternalEmbedProps) {
  if (!external) return null;

  // Get thumbnail URL using different patterns for external embeds
  const getThumbnailUrl = () => {
    if (!external.thumb?.ref?.$link) return null;
    
    const cid = external.thumb.ref.$link;
    
    if (authorDid) {
      return `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${cid}@jpeg`;
    }
    
    return `https://cdn.bsky.app/img/feed_thumbnail/plain/${cid}@jpeg`;
  };

  // Check if this might be a GIF or video based on URL
  const isMedia = () => {
    const url = external.uri.toLowerCase();
    return url.includes('.gif') || url.includes('.mp4') || url.includes('.webm') || 
           url.includes('tenor.com') || url.includes('giphy.com');
  };

  // Check if it's specifically a GIF
  const isGif = () => {
    const url = external.uri.toLowerCase();
    return url.includes('.gif') || url.includes('tenor.com') || url.includes('giphy.com');
  };

  // Get a nice domain name for display
  const getDomain = () => {
    try {
      return new URL(external.uri).hostname.replace('www.', '');
    } catch {
      return external.uri;
    }
  };

  const thumbnailUrl = getThumbnailUrl();
  const domain = getDomain();
  const isMediaContent = isMedia();
  const isGifContent = isGif();

  // Add error handling for media loading
  const [mediaError, setMediaError] = React.useState(false);
  const [mediaLoaded, setMediaLoaded] = React.useState(false);

  const handleMediaError = () => {
    console.error('Media failed to load:', isGifContent ? external.uri : thumbnailUrl);
    setMediaError(true);
  };

  const handleMediaLoad = () => {
        setMediaLoaded(true);
  };

  const embedContent = (
    <>
      {/* Show GIF directly or thumbnail for other content */}
      <div className="relative bg-gray-100 dark:bg-gray-800 w-full">
        {!mediaError ? (
          <img
            src={isGifContent ? external.uri : (thumbnailUrl || external.uri)}
            alt={external.title || 'External content'}
            className="block object-contain shadow-md w-full"
            style={{ maxHeight: '400px' }}
            loading="lazy"
            onError={handleMediaError}
            onLoad={handleMediaLoad}
          />
        ) : (
          /* Fallback when media fails to load */
          <div 
            className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 shadow-md w-full"
            style={{ height: '300px' }}
          >
            <div className="text-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-12 w-12 text-gray-400 mx-auto mb-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-500">Media unavailable</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3">
        {/* Domain/Source */}
        <div className="flex items-center gap-1 mb-1">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-3 w-3 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {domain}
          </span>
        </div>
        
        {/* Title */}
        {external.title && (
          <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
            {external.title}
          </h3>
        )}
        
        {/* Description */}
        {external.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {external.description}
          </p>
        )}
        
        {/* Media indicator */}
        {isMediaContent && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs text-blue-700 dark:text-blue-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {isGifContent ? 'GIF' : 'Media'}
          </div>
        )}
      </div>
    </>
  );

  // Conditionally wrap in link based on hideLink prop
  if (hideLink) {
    return (
      <div className="mt-3">
        <div className="block w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {embedContent}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <a
        href={external.uri}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-900"
      >
        {embedContent}
      </a>
    </div>
  );
} 