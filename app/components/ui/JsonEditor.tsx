'use client';

import React, { useState, useEffect, useRef } from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  error?: string | null;
}

export default function JsonEditor({ 
  value, 
  onChange, 
  placeholder = '{}',
  minHeight = '200px',
  maxHeight = '400px',
  error
}: JsonEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Validate JSON
  useEffect(() => {
    try {
      if (localValue.trim()) {
        JSON.parse(localValue);
        setIsValid(true);
      }
    } catch {
      setIsValid(false);
    }
  }, [localValue]);


  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(localValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setLocalValue(formatted);
      onChange(formatted);
    } catch {
      // Invalid JSON, can't format
    }
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">JSON Editor</span>
          {!isValid && localValue.trim() && (
            <span className="text-xs text-red-500">Invalid JSON</span>
          )}
        </div>
        <button
          type="button"
          onClick={formatJson}
          disabled={!isValid || !localValue.trim()}
          className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Format
        </button>
      </div>

      <div className="relative">
        {/* Simple textarea without syntax highlighting */}
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          spellCheck={false}
          className={`p-4 rounded-lg text-sm font-mono w-full resize-none text-gray-800 dark:text-gray-200 ${
            isFocused 
              ? 'bg-white dark:bg-gray-800 border-2 border-blue-500' 
              : 'bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600'
          }`}
          style={{ 
            minHeight, 
            maxHeight,
            outline: 'none'
          }}
        />
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Tip: Use Cmd/Ctrl+Enter to format JSON
      </div>
    </div>
  );
}