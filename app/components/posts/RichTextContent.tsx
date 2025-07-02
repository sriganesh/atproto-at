import React from 'react';
import Link from 'next/link';

type Facet = {
  index: {
    byteStart: number;
    byteEnd: number;
  };
  features: Array<{
    $type: string;
    uri?: string;
    did?: string;
  }>;
};

type RichTextContentProps = {
  text: string;
  facets?: Facet[];
  className?: string;
};

export default function RichTextContent({ text, facets = [], className = '' }: RichTextContentProps) {
  if (!text) return null;
  
  // If no facets, just return the plain text
  if (!facets.length) {
    return <p className={className}>{text}</p>;
  }
  
  // Convert text to UTF-8 bytes for proper facet positioning
  const textBytes = new TextEncoder().encode(text);
  const decoder = new TextDecoder();
  
  // Sort facets by byteStart to process in order
  const sortedFacets = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);
  
  // Build segments array with facets applied
  const segments: Array<React.ReactNode> = [];
  let lastEnd = 0;
  
  sortedFacets.forEach((facet, index) => {
    const { byteStart, byteEnd } = facet.index;
    
    // Add text before the facet using proper byte slicing
    if (byteStart > lastEnd) {
      const beforeBytes = textBytes.slice(lastEnd, byteStart);
      const beforeText = decoder.decode(beforeBytes);
      segments.push(beforeText);
    }
    
    // Get facet text using proper byte slicing
    const facetBytes = textBytes.slice(byteStart, byteEnd);
    const facetText = decoder.decode(facetBytes);
    
    // Find a link feature if available
    const linkFeature = facet.features.find(f => f.$type === 'app.bsky.richtext.facet#link');
    const mentionFeature = facet.features.find(f => f.$type === 'app.bsky.richtext.facet#mention');
    const hashtagFeature = facet.features.find(f => f.$type === 'app.bsky.richtext.facet#tag');
    
    if (linkFeature && linkFeature.uri) {
      segments.push(
        <a 
          key={`facet-${index}`}
          href={linkFeature.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 underline hover:no-underline transition-colors"
        >
          {facetText}
        </a>
      );
    } else if (mentionFeature && mentionFeature.did) {
      segments.push(
        <Link 
          key={`facet-${index}`}
          href={`/viewer?uri=${mentionFeature.did}`}
          className="text-blue-500 hover:text-blue-700 transition-colors"
        >
          {facetText}
        </Link>
      );
    } else if (hashtagFeature) {
      // Extract the tag name (remove the # symbol)
      const tagName = facetText.startsWith('#') ? facetText.slice(1) : facetText;
      segments.push(
        <a
          key={`facet-${index}`}
          href={`https://bsky.app/search?q=%23${encodeURIComponent(tagName)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 hover:underline transition-colors"
          title={`Search for ${facetText}`}
        >
          {facetText}
        </a>
      );
    } else {
      // Fallback for unknown facet types
      segments.push(facetText);
    }
    
    lastEnd = byteEnd;
  });
  
  // Add any remaining text using proper byte slicing
  if (lastEnd < textBytes.length) {
    const remainingBytes = textBytes.slice(lastEnd);
    const remainingText = decoder.decode(remainingBytes);
    segments.push(remainingText);
  }
  
  // Preserve line breaks in the rendered output
  const renderedSegments = segments.map((segment, index) => {
    if (typeof segment === 'string') {
      // Replace newlines with <br /> elements
      const lines = segment.split('\n');
      return lines.map((line, lineIndex) => (
        <React.Fragment key={`line-${index}-${lineIndex}`}>
          {lineIndex > 0 && <br />}
          {line}
        </React.Fragment>
      ));
    }
    return segment;
  });
  
  return <p className={className}>{renderedSegments}</p>;
} 