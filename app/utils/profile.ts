import { Agent } from '@atproto/api';

const PROFILE_COLLECTION = 'at.atproto.profile';
const PROFILE_RKEY = 'self';

/**
 * Ensures an at.atproto.profile record exists for the user.
 * Creates one with createdAt timestamp if it doesn't exist.
 * This is idempotent - safe to call multiple times.
 */
export async function ensureProfileRecord(agent: Agent, userDid: string): Promise<void> {
  try {
    // Check if profile record already exists
    await agent.com.atproto.repo.getRecord({
      repo: userDid,
      collection: PROFILE_COLLECTION,
      rkey: PROFILE_RKEY,
    });
    // Record exists, nothing to do
  } catch (err) {
    // Record doesn't exist, create it
    try {
      await agent.com.atproto.repo.createRecord({
        repo: userDid,
        collection: PROFILE_COLLECTION,
        rkey: PROFILE_RKEY,
        record: {
          $type: PROFILE_COLLECTION,
          createdAt: new Date().toISOString(),
        },
      });
      console.log('Created at.atproto.profile record for', userDid);
    } catch (createErr) {
      // Don't throw - profile creation is non-critical
      console.error('Failed to create profile record:', createErr);
    }
  }
}
