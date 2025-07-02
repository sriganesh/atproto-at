'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthenticatedRequest } from '@/app/hooks/useAuthenticatedRequest';
import UserAvatar from '../profiles/UserAvatar';

interface MentionSuggestion {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface MentionAutocompleteProps {
  searchTerm: string;
  onSelect: (mention: MentionSuggestion) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export default function MentionAutocomplete({ 
  searchTerm, 
  onSelect, 
  onClose,
  position 
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { executeRequest } = useAuthenticatedRequest();
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
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
            onSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onClose]);

  // Search for actors
  const searchActors = useCallback(async (term: string) => {
    if (!term || term.length < 1) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await executeRequest(async (agent) => {
        const response = await agent.searchActorsTypeahead({
          q: term,
          limit: 8
        });
        return response.data.actors;
      });

      const mappedSuggestions: MentionSuggestion[] = results.map((actor: any) => ({
        did: actor.did,
        handle: actor.handle,
        displayName: actor.displayName,
        avatar: actor.avatar
      }));

      setSuggestions(mappedSuggestions);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Failed to search actors:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [executeRequest]);

  // Debounced search
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchActors(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchActors]);

  // Don't render if no search term
  if (!searchTerm) return null;

  return (
    <div 
      ref={menuRef}
      className="absolute z-50 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto"
      style={{ 
        top: position.top, 
        left: position.left,
        minWidth: '200px',
        maxWidth: '300px'
      }}
    >
      {isLoading ? (
        <div className="p-3 text-center text-gray-500">
          <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="py-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.did}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <UserAvatar 
                handle={suggestion.handle} 
                avatar={suggestion.avatar} 
                size="xs"
              />
              <div className="flex-1 text-left">
                <div className="font-medium text-sm">
                  {suggestion.displayName || suggestion.handle}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  @{suggestion.handle}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-3 text-center text-gray-500 text-sm">
          No users found
        </div>
      )}
    </div>
  );
}