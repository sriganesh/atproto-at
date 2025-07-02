'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { EXAMPLE_PROFILES, EXAMPLE_RECORDS } from '@/config/examples';
import InfoTooltip from './components/ui/InfoTooltip';
import TidClock from './components/ui/TidClock';
import { cleanInput } from '@/lib/utils/format/string-utils';
import LoginButton from './components/auth/LoginButton';
import UserMenu from './components/auth/UserMenu';
import SessionStatus from './components/auth/SessionStatus';
import HandleAutocomplete from './components/ui/HandleAutocomplete';
import { useAuth } from './components/auth/AuthProvider';
import FooterBadgeLink from './components/badges/FooterBadgeLink';

// Sample AT URIs for the animation with empty gaps
const SAMPLE_URIS = [
  'at://did:plc:7gm5ejhut7kia2kzglqfew5b',
  '',  // Empty gap
  'at://did:plc:aolkw4ueeudbonivrd4353kx',
  '',  // Empty gap
  'at://did:plc:o3ctvmwcvo3iwag2olmtbpx4/app.bsky.feed.post/3lnx2pvpft22r',
  '',  // Empty gap
  'at://did:plc:7gm5ejhut7kia2kzglqfew5b/app.bsky.feed.post/3lqgrasjofs2u',
  '',  // Empty gap
  'at://did:plc:7gm5ejhut7kia2kzglqfew5b/app.bsky.feed.post/3lkyrpsvzi226'
];

// Rolodex Animation Component
function UriRolodex() {
  const router = useRouter();
  const [currentUriIndex, setCurrentUriIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentUriIndex((prevIndex) => (prevIndex + 1) % SAMPLE_URIS.length);
    }, 1500); // Slightly slower rotation (1.5 seconds per item)
    
    return () => clearInterval(interval);
  }, []);
  
  const handleUriClick = (uri: string) => {
    // Don't navigate if it's an empty string
    if (!uri) return;
    
    // Clean the input
    let cleanedUri = cleanInput(uri);
    
    // If it's a plain DID, prepend "at://" temporarily for consistency
    if (cleanedUri && /^did:[a-z0-9:%-]+$/i.test(cleanedUri)) {
      cleanedUri = `at://${cleanedUri}`;
    }
    
    // Remove at:// prefix as expected by viewer
    cleanedUri = cleanedUri ? cleanedUri.replace(/^at:\/\//i, '') : '';
    
    // Navigate to the viewer page
    router.push(`/viewer?uri=${cleanedUri || ''}`);
  };
  
  return (
    <div className="flex justify-center items-center my-6 h-10 overflow-hidden font-mono">
      <div className="text-blue-500 font-medium inline-flex items-center h-full">atproto.</div>
      <div className="relative inline-flex h-full overflow-hidden" style={{ minWidth: '300px' }}>
        {SAMPLE_URIS.map((uri, index) => {
          return (
            <div 
              key={index}
              className="absolute w-full transition-all duration-700 ease-in-out text-gray-700 dark:text-gray-300 whitespace-nowrap inline-flex items-center h-full"
              style={{ 
                top: 0,
                opacity: index === currentUriIndex ? 1 : 0,
                transform: `translateY(${index === currentUriIndex ? '0' : '20px'})`,
                left: 0,
                lineHeight: '1'
              }}
            >
              {uri && (
                <button
                  onClick={() => handleUriClick(uri)}
                  className="text-blue-500 hover:text-blue-700 hover:underline cursor-pointer transition-colors focus:outline-none"
                  aria-label={`View ${uri}`}
                >
                  {uri}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper to get a random item from an array
const getRandomItem = (array: string[]) => {
  return array[Math.floor(Math.random() * array.length)];
};

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const [uri, setUri] = useState('');
  const [randomProfile, setRandomProfile] = useState('');
  const [randomRecord, setRandomRecord] = useState('');
  
  useEffect(() => {
    // Set random examples on component mount
    setRandomProfile(getRandomItem(EXAMPLE_PROFILES));
    setRandomRecord(getRandomItem(EXAMPLE_RECORDS));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean the input: trim whitespace and remove invisible characters
    let cleanedUri = cleanInput(uri.trim());
    
    // If it's a plain DID (starts with "did:"), prepend "at://" temporarily for consistency
    if (cleanedUri && /^did:[a-z0-9:%-]+$/i.test(cleanedUri)) {
      cleanedUri = `at://${cleanedUri}`;
    }
    
    // Remove at:// prefix if present, as the viewer path expects the URI without protocol
    cleanedUri = cleanedUri ? cleanedUri.replace(/^at:\/\//i, '') : '';
    
    // Redirect to viewer with the URI
    router.push(`/viewer?uri=${cleanedUri}`);
  };
  
  const handleExampleClick = (example: string) => {
    // Clean the example before navigating
    let cleanedExample = cleanInput(example);
    
    // If it's a plain DID, prepend "at://" temporarily for consistency
    if (cleanedExample && /^did:[a-z0-9:%-]+$/i.test(cleanedExample)) {
      cleanedExample = `at://${cleanedExample}`;
    }
    
    // Remove at:// prefix as expected by viewer
    cleanedExample = cleanedExample ? cleanedExample.replace(/^at:\/\//i, '') : '';
    
    router.push(`/viewer?uri=${cleanedExample || ''}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      {/* Session status notification */}
      <SessionStatus />
      
      {/* Auth UI in top right */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-[100]">
        <LoginButton />
        <UserMenu />
      </div>
      
      <div className="max-w-lg w-full mx-auto">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold mb-2">
            <span>atproto.</span><span className="text-blue-500">at://</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">AT Protocol Explorer</p>
          
          {/* Add URI Animation */}
          <UriRolodex />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="text-center mb-6">
            <div className="flex flex-col items-center">
              <p className="text-lg mb-1 flex items-center">
                Prefix <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mx-1">atproto.</code>
              </p>
              <div className="flex flex-wrap justify-center items-center text-lg">
                <p>to any AT URI to preview</p>
                <InfoTooltip tooltipText="For Firefox and Safari, use https://atproto." />
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="flex flex-col gap-3">
              <HandleAutocomplete
                value={uri}
                onChange={setUri}
                onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                onSuggestionSelect={(suggestion) => {
                  // When a suggestion is selected, navigate directly using the DID
                  router.push(`/viewer?uri=${suggestion.did}`);
                }}
                placeholder="Enter an AT Protocol URI, DID, Bluesky handle or URL"
                inputClassName="w-full p-4 text-base sm:text-lg border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-sm"
              />
              <button
                type="submit"
                className="w-full p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition text-lg font-medium cursor-pointer"
              >
                View
              </button>
            </div>
          </form>
          
          {/* Example Links */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-3">Try an example:</p>
            
            <div className="flex flex-col gap-3">
              {/* Profile Example */}
              <button
                onClick={() => handleExampleClick(randomProfile)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition text-sm text-left group cursor-pointer"
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium mr-2">Profile:</span>
                  <span className="text-blue-500 group-hover:underline cursor-pointer">@{randomProfile}</span>
                </div>
              </button>
              
              {/* Record Example */}
              <button
                onClick={() => handleExampleClick(randomRecord)}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition text-sm text-left group cursor-pointer"
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h-1v2h1v-2zm1-6h-2v2h2V5zm0 4H8v2h8V9zm0-4h-1v2h1V5z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium mr-2">Record:</span>
                  <span className="text-blue-500 group-hover:underline truncate cursor-pointer">at://{randomRecord}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <TidClock />
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="/privacy" className="text-gray-500 hover:text-blue-500 hover:underline">Privacy</a>
            <span className="text-gray-400">•</span>
            <a href="/terms" className="text-gray-500 hover:text-blue-500 hover:underline">Terms</a>
            <span className="text-gray-400">•</span>
            <a href="https://github.com/sriganesh/atproto-at" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 hover:underline">Source Code</a>
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="https://bsky.app/profile/atproto.at" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@atproto.at</a>
            <span className="text-gray-400">•</span>
            <a href="https://bsky.app/profile/sri.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@sri.xyz</a>
            <FooterBadgeLink />
          </div>
        </div>
      </div>
    </main>
  );
}

