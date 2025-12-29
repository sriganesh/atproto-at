import { Agent } from '@atproto/api';

const SETTINGS_COLLECTION = 'at.atproto.settings';
const SETTINGS_RKEY = 'self';

export type ViewType = 'repo' | 'dashboard';

export interface UserSettings {
  $type: typeof SETTINGS_COLLECTION;
  defaultView: ViewType;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ensures an at.atproto.settings record exists for the user.
 * Creates one with default settings if it doesn't exist.
 * This is idempotent - safe to call multiple times.
 */
export async function ensureSettingsRecord(agent: Agent, userDid: string): Promise<void> {
  try {
    // Check if settings record already exists
    await agent.com.atproto.repo.getRecord({
      repo: userDid,
      collection: SETTINGS_COLLECTION,
      rkey: SETTINGS_RKEY,
    });
    // Record exists, nothing to do
  } catch (err) {
    // Record doesn't exist, create it with defaults
    try {
      const now = new Date().toISOString();
      await agent.com.atproto.repo.createRecord({
        repo: userDid,
        collection: SETTINGS_COLLECTION,
        rkey: SETTINGS_RKEY,
        record: {
          $type: SETTINGS_COLLECTION,
          defaultView: 'repo',
          createdAt: now,
          updatedAt: now,
        } satisfies UserSettings,
      });
      console.log('Created at.atproto.settings record for', userDid);
    } catch (createErr) {
      // Don't throw - settings creation is non-critical
      console.error('Failed to create settings record:', createErr);
    }
  }
}

/**
 * Gets the user's settings record.
 * Returns null if the record doesn't exist.
 */
export async function getSettingsRecord(agent: Agent, userDid: string): Promise<UserSettings | null> {
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: userDid,
      collection: SETTINGS_COLLECTION,
      rkey: SETTINGS_RKEY,
    });
    return response.data.value as unknown as UserSettings;
  } catch (err) {
    return null;
  }
}

/**
 * Updates the user's settings record.
 * Creates one if it doesn't exist.
 */
export async function updateSettingsRecord(
  agent: Agent,
  userDid: string,
  updates: Partial<Omit<UserSettings, '$type' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const existing = await getSettingsRecord(agent, userDid);
  const now = new Date().toISOString();

  const newSettings: UserSettings = {
    $type: SETTINGS_COLLECTION,
    defaultView: updates.defaultView ?? existing?.defaultView ?? 'repo',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await agent.com.atproto.repo.putRecord({
    repo: userDid,
    collection: SETTINGS_COLLECTION,
    rkey: SETTINGS_RKEY,
    record: newSettings as unknown as { [x: string]: unknown },
  });
}
    