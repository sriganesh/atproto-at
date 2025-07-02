import React, { useState, useEffect } from 'react';
import { resolveDid } from '../../../lib/edge-atproto';

type VideoData = {
  video: {
    ref: {
      $link: string;
    };
    mimeType: string;
    size?: number;
  };
  aspectRatio?: {
    width: number;
    height: number;
  };
};

type VideoEmbedProps = {
  videoData: VideoData;
  authorDid?: string;
  postUri?: string;
};

export default function VideoEmbed({ videoData, authorDid, postUri }: VideoEmbedProps) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [pdsEndpoint, setPdsEndpoint] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  
  if (!videoData) return null;
  
  // Extract post ID from post URI if available
  let postId = '';
  if (postUri) {
    const parts = postUri.split('/');
    postId = parts[parts.length - 1];
  }
  
  // Get the PDS endpoint for the author on component mount using cached DID resolution
  useEffect(() => {
    const fetchPdsEndpoint = async () => {
      if (!authorDid) return;
      
      try {
                const pds = await resolveDid(authorDid);
        if (pds) {
                    setPdsEndpoint(pds);
        } else {
          console.warn(`VideoEmbed: Could not resolve DID ${authorDid}`);
        }
      } catch (error) {
        console.error('VideoEmbed: Error resolving DID:', error);
      }
    };
    
    fetchPdsEndpoint();
  }, [authorDid]);
  
  // Extract the video CID from the link
  const getVideoCid = (link: string) => {
    return link.replace('$link', '').trim();
  };
  
  // Get video thumbnail URL - use working CDN format from blobs page
  const getVideoThumbnailUrl = () => {
    const cid = getVideoCid(videoData.video.ref.$link);
    
    if (authorDid) {
      return `https://video.cdn.bsky.app/hls/${authorDid}/${cid}/thumbnail.jpg`;
    }
    
    return '';
  };
  
  // Get direct XRPC blob URL for video playback
  const getDirectBlobUrl = () => {
    if (!pdsEndpoint || !authorDid) return null;
    
    const cid = getVideoCid(videoData.video.ref.$link);
    return `${pdsEndpoint}/xrpc/com.atproto.sync.getBlob?did=${authorDid}&cid=${cid}`;
  };

  // Get CDN download URL for .ts video segments
  const getVideoCdnDownloadUrl = () => {
    const cid = getVideoCid(videoData.video.ref.$link);
    
    if (authorDid) {
      return `https://video.cdn.bsky.app/hls/${authorDid}/${cid}/720p/video0.ts`;
    }
    
    return null;
  };
  
  const thumbnailUrl = getVideoThumbnailUrl();
  const directBlobUrl = getDirectBlobUrl();
  const videoCdnDownloadUrl = getVideoCdnDownloadUrl();
  
  // Toggle video playing state
  const handlePlayClick = () => {
    setVideoPlaying(true);
  };
  
  // For video preview we'll show a thumbnail with a play icon
  return (
    <div className="mt-3">
      {/* Video player area */}
      <div 
        className={`inline-block hover:opacity-90 hover:shadow-lg transition-all duration-200 rounded-lg overflow-hidden shadow-md ${!videoPlaying ? 'cursor-pointer' : ''}`}
        onClick={!videoPlaying ? handlePlayClick : undefined}
      >
        {videoPlaying && directBlobUrl ? (
          // Actual video player - use PDS blob URL for playback
          <video 
            className="block object-contain"
            style={{ maxHeight: '400px', maxWidth: '100%' }}
            controls
            autoPlay
            src={directBlobUrl}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          // Thumbnail with play button - use same approach as blobs page
          <div className="relative">
            {!thumbnailError && thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="Video thumbnail"
                className="block object-contain"
                style={{ maxHeight: '400px', maxWidth: '100%' }}
                onError={() => setThumbnailError(true)}
                onLoad={() => {
                  // Thumbnail loaded successfully
                }}
              />
            ) : (
              // Fallback when no thumbnail
              <div 
                className="flex items-center justify-center bg-gray-200 dark:bg-gray-700"
                style={{ height: '300px', maxWidth: '100%' }}
              >
                <div className="text-center text-gray-500">
                  <svg className="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">Video</span>
                </div>
              </div>
            )}
            
            {/* Simple play button overlay - same as blobs page */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black bg-opacity-60 rounded-full p-3 hover:bg-opacity-80 transition-all">
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-2 flex justify-between items-center">
              <span className="text-white text-sm">Video {videoData.video.mimeType.split('/')[1].toUpperCase()}</span>
              <span className="text-white text-xs">Click to play</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      {videoCdnDownloadUrl && (
        <div className="mt-2 flex justify-start">
          <a
            href={videoCdnDownloadUrl}
            download
            className="text-blue-500 text-sm hover:underline flex items-center gap-1 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </a>
        </div>
      )}
    </div>
  );
} 