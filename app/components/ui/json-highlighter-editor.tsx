import { ReactNode } from 'react';

// Function to apply syntax highlighting to JSON string for the editor
// This version doesn't create links to maintain cursor position alignment
export const highlightJsonForEditor = (jsonStr: string): ReactNode => {
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

      if (isKey) {
        // Property key
        tokens.push(
          <span key={tokens.length} className="text-purple-600 dark:text-purple-400">
            {stringContent}
          </span>
        );
      } else {
        // String value - no links, just color
        tokens.push(
          <span key={tokens.length} className="text-green-600 dark:text-green-400">
            {stringContent}
          </span>
        );
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