// Utility functions for JSON formatting

// Function to break long strings intelligently at word boundaries
export const breakLongString = (str: string, maxLength: number = 80, indent: string = ''): string => {
  if (str.length <= maxLength) return str;
  
  // For URLs, break at natural points like slashes
  if (str.startsWith('http') || str.startsWith('at://')) {
    const parts: string[] = [];
    let current = '';
    
    for (let i = 0; i < str.length; i++) {
      current += str[i];
      
      // Break after slashes, but not if it would make the line too short
      if ((str[i] === '/' || str[i] === '?' || str[i] === '&') && current.length >= 40) {
        parts.push(current);
        current = indent;
      } else if (current.length >= maxLength) {
        // Force break if we hit max length
        parts.push(current);
        current = indent;
      }
    }
    
    if (current.length > indent.length) {
      parts.push(current);
    }
    
    return parts.join('\n');
  }
  
  // For regular text, break at word boundaries
  const words = str.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxLength) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = indent + word;
      } else {
        // Word itself is longer than maxLength, break it
        if (word.length > maxLength) {
          for (let i = 0; i < word.length; i += maxLength) {
            const chunk = word.substring(i, i + maxLength);
            lines.push(i === 0 ? chunk : indent + chunk);
          }
          currentLine = '';
        } else {
          currentLine = indent + word;
        }
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.join('\n');
};

// Function to get current indentation level
export const getCurrentIndent = (jsonStr: string, position: number): string => {
  let indent = '';
  for (let i = position - 1; i >= 0; i--) {
    if (jsonStr[i] === '\n') {
      for (let j = i + 1; j < position; j++) {
        if (jsonStr[j] === ' ') {
          indent += ' ';
        } else {
          break;
        }
      }
      break;
    }
  }
  return indent;
}; 