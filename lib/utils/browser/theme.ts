// Centralized theme system for AT Protocol record types
// This ensures consistent colors and styling across all components

export type RecordType = 
  | 'post' 
  | 'reply' 
  | 'like' 
  | 'repost' 
  | 'follow' 
  | 'block' 
  | 'list' 
  | 'profile'
  | 'listitem'
  | 'unknown';

export interface ThemeColors {
  icon: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

// Centralized color definitions for all record types
export const RECORD_THEMES: Record<RecordType, ThemeColors> = {
  post: {
    icon: '💬',
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  reply: {
    icon: '↩️',
    textColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  like: {
    icon: '❤️',
    textColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  repost: {
    icon: '🔄',
    textColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  follow: {
    icon: '👥',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  block: {
    icon: '🚫',
    textColor: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800'
  },
  list: {
    icon: '📋',
    textColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  listitem: {
    icon: '📋',
    textColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  profile: {
    icon: '👤',
    textColor: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  unknown: {
    icon: '📄',
    textColor: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800'
  }
};

// Helper function to get theme by record type string
export function getRecordTheme(recordType: string): ThemeColors {
  // Convert AT Protocol type to our theme key
  if (recordType.includes('post')) {
    // Check if it's a reply by looking for reply field (this would need to be passed separately)
    return RECORD_THEMES.post;
  } else if (recordType.includes('like')) {
    return RECORD_THEMES.like;
  } else if (recordType.includes('repost')) {
    return RECORD_THEMES.repost;
  } else if (recordType.includes('follow')) {
    return RECORD_THEMES.follow;
  } else if (recordType.includes('block')) {
    return RECORD_THEMES.block;
  } else if (recordType.includes('list') && !recordType.includes('listitem')) {
    return RECORD_THEMES.list;
  } else if (recordType.includes('listitem')) {
    return RECORD_THEMES.listitem;
  } else if (recordType.includes('profile')) {
    return RECORD_THEMES.profile;
  } else {
    return RECORD_THEMES.unknown;
  }
}

// Helper function to get theme with reply detection
export function getPostTheme(isReply: boolean = false): ThemeColors {
  return isReply ? RECORD_THEMES.reply : RECORD_THEMES.post;
}

// Jetstream event colors (for consistency with existing JetstreamEventItem)
export const JETSTREAM_COLORS = {
  green: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20',
  blue: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
  red: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
  purple: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20',
  orange: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20',
  yellow: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
  gray: 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
};

// Color mapping for jetstream events
export function getJetstreamEventColor(event: any): keyof typeof JETSTREAM_COLORS {
  if (event.kind === 'commit' && event.commit) {
    switch (event.commit.operation) {
      case 'create': return 'green';
      case 'update': return 'blue';
      case 'delete': return 'red';
    }
  } else if (event.kind === 'identity') {
    return 'purple';
  } else if (event.kind === 'account') {
    return 'orange';
  }
  return 'gray';
} 