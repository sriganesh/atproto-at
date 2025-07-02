import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthProvider';
import UserAvatar from '../profiles/UserAvatar';

type AddUsersModalProps = {
  onClose: () => void;
  onAdd: (userDids: string[]) => void;
  listUri: string;
};

interface UserSuggestion {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

export default function AddUsersModal({ onClose, onAdd, listUri }: AddUsersModalProps) {
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSuggestion[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, UserSuggestion>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();
  
  // Auto-search as user types
  useEffect(() => {
    // Clear previous timeout
    clearTimeout(searchTimeoutRef.current);
    
    // Clean the input value - remove @ if present at start
    const cleanQuery = searchQuery.startsWith('@') ? searchQuery.slice(1) : searchQuery;
    
    // Don't search if too short or empty
    if (cleanQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    // Add debounce
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Use the public Bluesky API for typeahead search
        const response = await fetch(
          `https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(cleanQuery)}&limit=10`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        
        const data = await response.json();
        
        const mappedResults: UserSuggestion[] = data.actors.map((actor: any) => ({
          did: actor.did,
          handle: actor.handle,
          displayName: actor.displayName,
          avatar: actor.avatar,
          description: actor.description
        }));

        setSearchResults(mappedResults);
      } catch (error) {
        console.error('Failed to search users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery]);
  
  const toggleUserSelection = (user: UserSuggestion) => {
    const newSelected = new Map(selectedUsers);
    if (newSelected.has(user.did)) {
      newSelected.delete(user.did);
    } else {
      newSelected.set(user.did, user);
    }
    setSelectedUsers(newSelected);
  };
  
  const handleAdd = async () => {
    if (selectedUsers.size === 0) {
      alert('Please select at least one user to add');
      return;
    }
    
    setIsAdding(true);
    try {
      await onAdd(Array.from(selectedUsers.keys()));
    } catch (error) {
      setIsAdding(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4">Add Users to List</h2>
        
        {/* Search Input with auto-complete */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Search for users to add..."
              disabled={isAdding}
              autoFocus
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-300"></div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Start typing a handle to search for users
          </p>
        </div>
        
        {/* Selected Users Section */}
        {selectedUsers.size > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Selected Users ({selectedUsers.size})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Array.from(selectedUsers.values()).map((user) => (
                <div
                  key={user.did}
                  className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <UserAvatar
                    avatar={user.avatar}
                    handle={user.handle}
                    size="xs"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user.displayName || user.handle}
                    </div>
                    <div className="text-xs text-gray-500">@{user.handle}</div>
                  </div>
                  <button
                    onClick={() => toggleUserSelection(user)}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                    title="Remove from selection"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Search Results */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {searchQuery && searchResults.length === 0 && !isSearching && (
            <p className="text-gray-500 text-center py-8">
              No users found matching "{searchQuery}"
            </p>
          )}
          
          {!searchQuery && selectedUsers.size === 0 && (
            <p className="text-gray-500 text-center py-8">
              Search for users to add them to the list
            </p>
          )}
          
          {searchResults.map((user) => {
            const isSelected = selectedUsers.has(user.did);
            return (
              <div
                key={user.did}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 opacity-50'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => !isSelected && toggleUserSelection(user)}
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatar={user.avatar}
                    handle={user.handle}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {user.displayName || user.handle}
                    </div>
                    <div className="text-sm text-gray-500">@{user.handle}</div>
                    {user.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-1">
                        {user.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="text-sm text-gray-500">Already selected</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={isAdding}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            disabled={isAdding || selectedUsers.size === 0}
          >
            {isAdding ? 'Adding...' : `Add ${selectedUsers.size} User${selectedUsers.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}