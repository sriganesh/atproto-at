import { ReactNode } from 'react';
import { breakLongString, getCurrentIndent } from './json-utils';

// Function to apply syntax highlighting to JSON string
export const highlightJson = (jsonStr: string): ReactNode => {
  const tokens: ReactNode[] = [];
  let i = 0;

  while (i < jsonStr.length) {
    const char = jsonStr[i];

    // Handle strings
    if (char === '"') {
      let stringContent = '"';
      i++;
      while (i < jsonStr.length && jsonStr[i] !== '"') {
        if (jsonStr[i] === '\\') {
          stringContent += jsonStr[i] + (jsonStr[i + 1] || '');
          i += 2;
        } else {
          stringContent += jsonStr[i];
          i++;
        }
      }
      stringContent += '"'; // closing quote
      i++; // move past closing quote

      // Check if this string is a property key (followed by colon)
      let j = i;
      while (j < jsonStr.length && /\s/.test(jsonStr[j])) j++;
      const isKey = jsonStr[j] === ':';

      // Check if this string is an AT Protocol URI
      const content = stringContent.slice(1, -1); // remove quotes
      const isAtUri = content.startsWith('at://');
      const isHttpUrl = content.startsWith('http://') || content.startsWith('https://');

      if (isKey) {
        // Property key
        tokens.push(
          <span key={tokens.length} className="text-purple-600 dark:text-purple-400">
            {stringContent}
          </span>
        );
      } else if (isAtUri) {
        // AT Protocol URI - break at natural points for very long URIs
        if (content.length > 70) {
          const currentIndent = getCurrentIndent(jsonStr, i - stringContent.length);
          const brokenContent = breakLongString(content, 70, currentIndent + '  ');
          const brokenStringContent = '"' + brokenContent + '"';
          
          tokens.push(
            <a
              key={tokens.length}
              href={`/viewer?uri=${content.substring(5)}`}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              <span style={{ whiteSpace: 'pre-wrap' }}>{brokenStringContent}</span>
            </a>
          );
        } else {
          // Short URI, don't break
          tokens.push(
            <a
              key={tokens.length}
              href={`/viewer?uri=${content.substring(5)}`}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              {stringContent}
            </a>
          );
        }
      } else if (isHttpUrl) {
        // HTTP/HTTPS URL - break at natural points for very long URLs and open in new window
        if (content.length > 70) {
          const currentIndent = getCurrentIndent(jsonStr, i - stringContent.length);
          const brokenContent = breakLongString(content, 70, currentIndent + '  ');
          const brokenStringContent = '"' + brokenContent + '"';
          
          tokens.push(
            <a
              key={tokens.length}
              href={content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              <span style={{ whiteSpace: 'pre-wrap' }}>{brokenStringContent}</span>
            </a>
          );
        } else {
          // Short URL, don't break
          tokens.push(
            <a
              key={tokens.length}
              href={content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              {stringContent}
            </a>
          );
        }
      } else {
        // Regular string value - break if very long
        const isVeryLong = content.length > 60;
        
        if (isVeryLong) {
          const currentIndent = getCurrentIndent(jsonStr, i - stringContent.length);
          const brokenContent = breakLongString(content, 60, currentIndent + '  ');
          const brokenStringContent = '"' + brokenContent + '"';
          tokens.push(
            <span 
              key={tokens.length} 
              className="text-green-600 dark:text-green-400"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {brokenStringContent}
            </span>
          );
        } else {
          tokens.push(
            <span 
              key={tokens.length} 
              className="text-green-600 dark:text-green-400"
            >
              {stringContent}
            </span>
          );
        }
      }
      continue;
    }

    // Handle numbers
    if (/\d/.test(char) || (char === '-' && /\d/.test(jsonStr[i + 1] || ''))) {
      let numberStr = '';
      while (i < jsonStr.length && /[0-9\-\.eE\+]/.test(jsonStr[i])) {
        numberStr += jsonStr[i];
        i++;
      }
      tokens.push(
        <span key={tokens.length} className="text-blue-600 dark:text-blue-400">
          {numberStr}
        </span>
      );
      continue;
    }

    // Handle booleans and null
    if (jsonStr.substr(i, 4) === 'true') {
      tokens.push(
        <span key={tokens.length} className="text-yellow-600 dark:text-yellow-400">
          true
        </span>
      );
      i += 4;
      continue;
    }
    if (jsonStr.substr(i, 5) === 'false') {
      tokens.push(
        <span key={tokens.length} className="text-yellow-600 dark:text-yellow-400">
          false
        </span>
      );
      i += 5;
      continue;
    }
    if (jsonStr.substr(i, 4) === 'null') {
      tokens.push(
        <span key={tokens.length} className="text-gray-500 dark:text-gray-400">
          null
        </span>
      );
      i += 4;
      continue;
    }

    // Handle structural characters and whitespace
    if (/[\{\}\[\],:]/.test(char)) {
      tokens.push(
        <span key={tokens.length} className="text-gray-600 dark:text-gray-300">
          {char}
        </span>
      );
    } else {
      // Whitespace and other characters
      tokens.push(char);
    }
    i++;
  }

  return tokens;
}; 