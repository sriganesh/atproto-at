import { AtpAgent } from '@atproto/api';

export interface BadgeTypeConfig {
  rkey: string;
  title: string;
  description: string;
  emoji: string;
  defaultMessage: string;
  gradient: string;
  whatItRepresents: string;
}

// Predefined badge types - all self-creatable
export const BADGE_TYPES: Record<string, BadgeTypeConfig> = {
  earlyadopter: {
    rkey: 'earlyadopter',
    title: 'Early Adopter Badge',
    description: 'Show your support for Taproot (atproto.at://) by creating a badge in your repository!',
    emoji: '🏆',
    defaultMessage: 'I love using Taproot (atproto.at://) to explore the AT Protocol! 🚀',
    gradient: 'from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
    whatItRepresents: "You're an early supporter of Taproot (atproto.at://)"
  },
  // Example: Add new badges here as needed
  explorer: {
    rkey: 'explorer',
    title: 'AT Protocol Explorer',
    description: 'You love diving deep into AT Protocol data!',
    emoji: '🔍',
    defaultMessage: 'Exploring the depths of AT Protocol with Taproot (atproto.at://)!',
    gradient: 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
    whatItRepresents: "You're an avid AT Protocol explorer"
  }
};

// Current active badge - change this to control which badge is available
// When changing seasons:
// 1. Add new badge definition above
// 2. Update CURRENT_BADGE to the new badge key
// 3. Deploy - the UI will automatically update everywhere
export const CURRENT_BADGE = 'earlyadopter';

// Function to issue a badge to a user
export async function issueBadge(
  agent: AtpAgent,
  userDid: string,
  badgeType: keyof typeof BADGE_TYPES | string,
  customMessage?: string
) {
  const badgeConfig = BADGE_TYPES[badgeType] || {
    rkey: badgeType,
    defaultMessage: `I have the ${badgeType} badge!`
  };

  const record = {
    $type: 'at.atproto.supporter.badge',
    createdAt: new Date().toISOString(),
    service: 'Taproot (atproto.at://)',
    message: customMessage || badgeConfig.defaultMessage,
    version: '1.0.0',
    badgeType: badgeType // Include badge type in the record
  };

  return await agent.com.atproto.repo.createRecord({
    repo: userDid,
    collection: 'at.atproto.supporter.badge',
    rkey: badgeConfig.rkey,
    record
  });
}

// Function to check if a user has a specific badge
export async function checkUserHasBadge(
  agent: AtpAgent,
  userDid: string,
  badgeType: string
): Promise<boolean> {
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: userDid,
      collection: 'at.atproto.supporter.badge',
      rkey: badgeType
    });
    return !!response.data;
  } catch (err) {
    return false;
  }
}

// Function to get all badges for a user
export async function getUserBadges(
  agent: AtpAgent,
  userDid: string
): Promise<Array<{ type: string; record: any }>> {
  try {
    const response = await agent.com.atproto.repo.listRecords({
      repo: userDid,
      collection: 'at.atproto.supporter.badge',
      limit: 100
    });

    return response.data.records.map(record => ({
      type: record.uri.split('/').pop() || 'unknown',
      record: record.value
    }));
  } catch (err) {
    return [];
  }
}