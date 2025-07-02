import React, { useState } from 'react';

type CreateListModalProps = {
  onClose: () => void;
  onCreate: (listData: { name: string; description?: string; purpose: string }) => void;
};

export default function CreateListModal({ onClose, onCreate }: CreateListModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState<'app.bsky.graph.defs#curatelist' | 'app.bsky.graph.defs#modlist'>('app.bsky.graph.defs#curatelist');
  const [isCreating, setIsCreating] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Please enter a list name');
      return;
    }
    
    setIsCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        purpose
      });
    } catch (error) {
      setIsCreating(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Create New List</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              List Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="My Awesome List"
              disabled={isCreating}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="A collection of interesting accounts..."
              rows={3}
              disabled={isCreating}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              List Purpose <span className="text-red-500">*</span>
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as typeof purpose)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={isCreating}
            >
              <option value="app.bsky.graph.defs#curatelist">Curation List (User list)</option>
              <option value="app.bsky.graph.defs#modlist">Moderation List</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Curation lists are for organizing users. Moderation lists can be used to mute/block users.
            </p>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}