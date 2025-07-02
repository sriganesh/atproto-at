'use client';

import React, { useRef, useState } from 'react';
import { highlightJson } from './json-highlighter';

interface JsonToImageProps {
  data: any;
  uri?: string;
}

export default function JsonToImage({ data, uri }: JsonToImageProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateImage = async () => {
    setIsGenerating(true);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Format JSON with 2-space indentation
      const jsonString = JSON.stringify(data, null, 2);
      
      // Set canvas size based on content
      const lines = jsonString.split('\n');
      const lineHeight = 20;
      const padding = 40;
      // Calculate header height based on URI length
      let headerHeight = 80;
      if (uri) {
        const testCtx = canvas.getContext('2d');
        if (testCtx) {
          testCtx.font = '12px monospace';
          const uriText = uri.startsWith('at://') ? uri : `at://${uri}`;
          const maxWidth = 900 - 80; // maxWidth - padding * 2
          
          // Calculate how many lines the URI will take
          let remainingUri = uriText;
          let lineCount = 0;
          
          while (remainingUri.length > 0) {
            let charsToFit = remainingUri.length;
            while (testCtx.measureText(remainingUri.substring(0, charsToFit)).width > maxWidth && charsToFit > 1) {
              charsToFit--;
            }
            
            // Try to break at a slash if possible
            let breakPoint = charsToFit;
            const lastSlash = remainingUri.lastIndexOf('/', charsToFit);
            if (lastSlash > charsToFit * 0.5) {
              breakPoint = lastSlash + 1;
            }
            
            lineCount++;
            remainingUri = remainingUri.substring(breakPoint);
          }
          
          // Add extra height for additional URI lines (16px per line)
          if (lineCount > 1) {
            headerHeight = 80 + (lineCount - 1) * 16;
          }
        }
      }
      const maxWidth = 900; // Max width for wrapping
      const charWidth = 8; // Approximate width per character
      
      // Process lines for wrapping - simpler approach to avoid duplication
      const wrappedLines: string[] = [];
      const maxCharsPerLine = Math.floor((maxWidth - padding * 2) / charWidth);
      
      lines.forEach(line => {
        if (line.length <= maxCharsPerLine) {
          wrappedLines.push(line);
        } else {
          // For long lines, break them into chunks
          let remaining = line;
          let isFirstChunk = true;
          const baseIndent = line.match(/^\s*/)?.[0] || '';
          
          while (remaining.length > 0) {
            if (isFirstChunk) {
              // First chunk keeps original indentation
              const chunk = remaining.substring(0, maxCharsPerLine);
              wrappedLines.push(chunk);
              remaining = remaining.substring(maxCharsPerLine);
              isFirstChunk = false;
            } else {
              // Subsequent chunks get extra indentation
              const chunk = remaining.substring(0, maxCharsPerLine - baseIndent.length - 2);
              if (chunk.trim()) {
                wrappedLines.push(baseIndent + '  ' + chunk);
              }
              remaining = remaining.substring(maxCharsPerLine - baseIndent.length - 2);
            }
          }
        }
      });
      
      // Calculate footer height based on URL length
      let footerHeight = 80;
      if (uri) {
        const testCtx = canvas.getContext('2d');
        if (testCtx) {
          testCtx.font = '12px monospace';
          const cleanUri = uri.startsWith('at://') ? uri : `at://${uri}`;
          const fullUrl = `https://atproto.at://${cleanUri.substring(5)}`;
          const maxUrlWidth = 900 - 80; // maxWidth - padding * 2
          
          // Calculate how many lines the URL will need
          let urlLineCount = 1;
          const urlWidth = testCtx.measureText(fullUrl).width;
          if (urlWidth > maxUrlWidth) {
            urlLineCount = Math.ceil(urlWidth / maxUrlWidth);
          }
          
          // Add extra height for additional URL lines (15px per line)
          if (urlLineCount > 1) {
            footerHeight = 80 + (urlLineCount - 1) * 15;
          }
        }
      }
      
      // Calculate dimensions
      const width = maxWidth;
      const height = wrappedLines.length * lineHeight + padding * 2 + headerHeight + footerHeight;
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);
      
      // Top blue bar - solid color
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, width, 6);
      
      // Header area - dark background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 6, width, headerHeight - 6);
      
      // Header content - "atproto." in white
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('atproto.', padding, 40);
      
      // "at://" in blue
      const atprotoWidth = ctx.measureText('atproto.').width;
      ctx.fillStyle = '#2563eb';
      ctx.fillText('at://', padding + atprotoWidth, 40);
      
      // URI if provided
      if (uri) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        const uriText = uri.startsWith('at://') ? uri : `at://${uri}`;
        const maxUriWidth = width - padding * 2;
        
        // Check if URI fits on one line
        if (ctx.measureText(uriText).width <= maxUriWidth) {
          // Single line - it fits!
          ctx.fillText(uriText, padding, 60);
        } else {
          // Need to wrap to multiple lines
          const uriLines: string[] = [];
          let remainingUri = uriText;
          
          while (remainingUri.length > 0) {
            // Find how many characters fit on this line
            let charsToFit = remainingUri.length;
            while (ctx.measureText(remainingUri.substring(0, charsToFit)).width > maxUriWidth && charsToFit > 1) {
              charsToFit--;
            }
            
            // Try to break at a slash if possible
            let breakPoint = charsToFit;
            const lastSlash = remainingUri.lastIndexOf('/', charsToFit);
            if (lastSlash > charsToFit * 0.5) {
              breakPoint = lastSlash + 1; // Include the slash
            }
            
            uriLines.push(remainingUri.substring(0, breakPoint));
            remainingUri = remainingUri.substring(breakPoint);
          }
          
          // Draw all URI lines
          let lineY = 60;
          uriLines.forEach(line => {
            ctx.fillText(line, padding, lineY);
            lineY += 16;
          });
        }
      }
      
      // Blue separator line between header and JSON content
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, headerHeight, width, 6);
      
      // JSON content with syntax highlighting
      ctx.font = '14px monospace';
      let y = headerHeight + padding;
      
      wrappedLines.forEach(line => {
        let x = padding;
        
        // Simple syntax highlighting
        const tokens = tokenizeLine(line);
        tokens.forEach(token => {
          ctx.fillStyle = token.color;
          ctx.fillText(token.text, x, y);
          x += ctx.measureText(token.text).width;
        });
        
        y += lineHeight;
      });
      
      // Footer - position it close to the JSON content
      const footerStartY = y + 20; // 20px gap from JSON content
      
      ctx.fillStyle = '#64748b';
      ctx.font = '12px monospace';
      
      // First line: "Generated at <timestamp> from"
      const timestamp = new Date().toISOString();
      ctx.fillText(`Generated at ${timestamp} from`, padding, footerStartY);
      
      // Second line: Full URL with special format
      if (uri) {
        const cleanUri = uri.startsWith('at://') ? uri : `at://${uri}`;
        const fullUrl = `https://atproto.at://${cleanUri.substring(5)}`; // Remove 'at://' prefix
        ctx.fillStyle = '#94a3b8';
        
        // Check if URL fits on one line
        const maxUrlWidth = width - padding * 2;
        if (ctx.measureText(fullUrl).width <= maxUrlWidth) {
          ctx.fillText(fullUrl, padding, footerStartY + 15);
        } else {
          // URL is too long, wrap it
          let remainingUrl = fullUrl;
          let urlY = footerStartY + 15;
          
          while (remainingUrl.length > 0) {
            // Find how many characters fit on this line
            let charsToFit = remainingUrl.length;
            while (ctx.measureText(remainingUrl.substring(0, charsToFit)).width > maxUrlWidth && charsToFit > 1) {
              charsToFit--;
            }
            
            // Try to break at a slash if possible
            let breakPoint = charsToFit;
            const lastSlash = remainingUrl.lastIndexOf('/', charsToFit);
            if (lastSlash > charsToFit * 0.7) {
              breakPoint = lastSlash + 1; // Include the slash
            }
            
            ctx.fillText(remainingUrl.substring(0, breakPoint), padding, urlY);
            remainingUrl = remainingUrl.substring(breakPoint);
            urlY += 15;
          }
        }
      }
      
      // Bottom blue bar - solid color
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, height - 6, width, 6);
      
      // Convert to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            // Try clipboard API first
            if (navigator.clipboard && window.ClipboardItem) {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 3000);
            } else {
              // Fallback: download the image
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `atproto-${Date.now()}.png`;
              a.click();
              URL.revokeObjectURL(url);
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 3000);
            }
          } catch (err) {
            console.error('Failed to copy image:', err);
            // Fallback to download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `atproto-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Simple tokenizer for syntax highlighting
  const tokenizeLine = (line: string): { text: string; color: string }[] => {
    const tokens: { text: string; color: string }[] = [];
    let currentIndex = 0;
    
    while (currentIndex < line.length) {
      let matched = false;
      
      // Check for whitespace first
      const whitespaceMatch = line.substring(currentIndex).match(/^\s+/);
      if (whitespaceMatch) {
        tokens.push({
          text: whitespaceMatch[0],
          color: '#e2e8f0'
        });
        currentIndex += whitespaceMatch[0].length;
        continue;
      }
      
      // Check for property key (string followed by colon)
      const keyMatch = line.substring(currentIndex).match(/^"([^"]*)":/);
      if (keyMatch) {
        tokens.push({
          text: keyMatch[0],
          color: '#c084fc' // Purple for keys
        });
        currentIndex += keyMatch[0].length;
        matched = true;
      }
      // Check for string value (not followed by colon)
      else if (line[currentIndex] === '"') {
        const stringMatch = line.substring(currentIndex).match(/^"([^"]*)"/);
        if (stringMatch) {
          tokens.push({
            text: stringMatch[0],
            color: '#4ade80' // Green for string values
          });
          currentIndex += stringMatch[0].length;
          matched = true;
        }
      }
      // Check for numbers
      else if (/\d/.test(line[currentIndex])) {
        const numberMatch = line.substring(currentIndex).match(/^\d+(\.\d+)?/);
        if (numberMatch) {
          tokens.push({
            text: numberMatch[0],
            color: '#fbbf24' // Yellow for numbers
          });
          currentIndex += numberMatch[0].length;
          matched = true;
        }
      }
      // Check for booleans and null
      else if (line.substring(currentIndex).match(/^(true|false|null)\b/)) {
        const boolMatch = line.substring(currentIndex).match(/^(true|false|null)\b/);
        if (boolMatch) {
          tokens.push({
            text: boolMatch[0],
            color: '#60a5fa' // Blue for booleans/null
          });
          currentIndex += boolMatch[0].length;
          matched = true;
        }
      }
      // Check for structural characters
      else if (/[{}\[\],:]/.test(line[currentIndex])) {
        tokens.push({
          text: line[currentIndex],
          color: '#94a3b8' // Gray for structural
        });
        currentIndex++;
        matched = true;
      }
      
      // If nothing matched, add as default text
      if (!matched) {
        tokens.push({
          text: line[currentIndex],
          color: '#e2e8f0' // Default white
        });
        currentIndex++;
      }
    }
    
    return tokens;
  };

  return (
    <div className="relative">
      <button
        onClick={generateImage}
        disabled={isGenerating}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
        {isGenerating ? 'Generating...' : 'Copy JSON as Image'}
      </button>
      
      {showSuccess && (
        <div className="absolute top-full mt-2 left-0 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Image copied to clipboard!
          </div>
        </div>
      )}
      
      {/* Hidden canvas for rendering */}
      <canvas 
        ref={canvasRef} 
        className="hidden" 
      />
    </div>
  );
}