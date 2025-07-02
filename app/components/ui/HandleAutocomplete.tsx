'use client';

import React, { useState, useEffect, useRef } from 'react';
import UserAvatar from '../profiles/UserAvatar';

interface HandleSuggestion {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface HandleAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onSuggestionSelect?: (suggestion: HandleSuggestion) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

export default function HandleAutocomplete({
  value,
  onChange,
  onSubmit,
  onSuggestionSelect,
  placeholder = "Enter a handle...",
  className = "",
  inputClassName = "",
  autoFocus = false
}: HandleAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<HandleSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for handles
  useEffect(() => {
    // Clear previous timeout
    clearTimeout(searchTimeoutRef.current);
    
    // Clean the input value - remove @ if present at start
    const cleanValue = value.startsWith('@') ? value.slice(1) : value;
    
    // Don't search if too short or empty
    if (cleanValue.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Add debounce
    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Use the public Bluesky API for typeahead search
        const response = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(cleanValue)}&limit=8`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        
        const data = await response.json();
        
        const mappedSuggestions: HandleSuggestion[] = data.actors.map((actor: any) => ({
          did: actor.did,
          handle: actor.handle,
          displayName: actor.displayName,
          avatar: actor.avatar
        }));

        setSuggestions(mappedSuggestions);
        setSelectedIndex(0);
        setShowSuggestions(mappedSuggestions.length > 0);
      } catch (error) {
        console.error('Failed to search actors:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeoutRef.current);
  }, [value]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (event.key === 'Enter' && onSubmit) {
        event.preventDefault();
        onSubmit(value);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        } else if (onSubmit) {
          onSubmit(value);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setShowSuggestions(false);
        break;
    }
  };

  const selectSuggestion = (suggestion: HandleSuggestion) => {
    setShowSuggestions(false);
    if (onSuggestionSelect) {
      // Call the custom handler with the full suggestion object
      onSuggestionSelect(suggestion);
    } else {
      // Fallback to old behavior
      onChange(suggestion.handle);
      if (onSubmit) {
        onSubmit(suggestion.handle);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-300"></div>
        </div>
      )}
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={menuRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.did}
              onClick={() => selectSuggestion(suggestion)}
              className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <UserAvatar
                avatar={suggestion.avatar}
                handle={suggestion.handle}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  {suggestion.displayName && (
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {suggestion.displayName}
                    </span>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    @{suggestion.handle}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}