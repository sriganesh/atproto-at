import { NextResponse } from 'next/server';
import { fetchRecord, fetchCollection, fetchProfile, fetchPlcLog } from '@/lib/edge-atproto';

interface RecordHandlerParams {
  pds: string;
  did: string;
  collection: string;
  rkey: string;
  cursorParam?: string;
  limitParam?: string;
}

/**
 * Handles requests for specific AT Protocol records
 * Includes fallback logic for when records aren't found
 */
export async function handleRecordRequest({ 
  pds, 
  did, 
  collection, 
  rkey,
  cursorParam,
  limitParam 
}: RecordHandlerParams) {
  const recordResult = await fetchRecord(pds, did, collection, rkey);
  
  if (!recordResult.success) {
    // Try to fall back to the collection level
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const collectionResult = await fetchCollection(pds, did, collection, cursorParam, limit);
    
    if (collectionResult.success && collectionResult.data.records && collectionResult.data.records.length > 0) {
      // Return the collection with an indication that the specific record was not found
      return NextResponse.json({
        type: 'collection',
        uri: `at://${did}/${collection}`,
        apiUrl: collectionResult.url,
        data: collectionResult.data,
        fallback: {
          attempted: 'record',
          attemptedUri: `at://${did}/${collection}/${rkey}`,
          error: recordResult.error,
          message: `Record '${rkey}' not found in collection '${collection}'. Showing collection instead.`
        }
      });
    } else {
      // Collection is empty or doesn't exist, fall back to profile level
      return handleProfileFallback({
        pds,
        did,
        collection,
        rkey,
        recordError: recordResult.error,
        collectionResult
      });
    }
  }
  
  // Special handling for profile records
  if (collection === 'app.bsky.actor.profile') {
    await enrichProfileRecord(pds, did, recordResult);
  }
  
  return NextResponse.json({
    type: 'record',
    uri: `at://${did}/${collection}/${rkey}`,
    apiUrl: recordResult.url,
    data: recordResult.data
  });
}

/**
 * Handles fallback to profile level when both record and collection fail
 */
async function handleProfileFallback({
  pds,
  did,
  collection,
  rkey,
  recordError,
  collectionResult
}: {
  pds: string;
  did: string;
  collection: string;
  rkey: string;
  recordError: string;
  collectionResult: any;
}) {
  const profileResult = await fetchProfile(pds, did);
  
  if (profileResult.success) {
    // Check if the collection actually exists in the repository
    const availableCollections = profileResult.data?.repoInfo?.collections || [];
    const collectionExists = availableCollections.some((col: string) => col === collection);
    
    // Fetch PLC log for the profile fallback
    let plcLogData = null;
    try {
      const plcLogResult = await fetchPlcLog(did);
      if (plcLogResult.success) {
        plcLogData = plcLogResult.data;
      } else {
        console.error(`Failed to fetch PLC log for fallback: ${plcLogResult.error}`);
      }
    } catch (err) {
      console.error('Failed to fetch PLC log for fallback:', err);
    }
    
    // Return the profile with indication of what failed
    const collectionError = collectionExists ? 
      `Collection '${collection}' exists but is empty (0 records)` : 
      `Collection '${collection}' does not exist in this repository`;
      
    return NextResponse.json({
      type: 'profile',
      uri: `at://${did}`,
      apiUrl: profileResult.url,
      data: profileResult.data,
      plcLog: plcLogData,
      fallback: {
        attempted: 'record_and_collection',
        attemptedUri: `at://${did}/${collection}/${rkey}`,
        attemptedCollectionUri: `at://${did}/${collection}`,
        error: `Record error: ${recordError}. Collection error: ${collectionError}`,
        message: `Record '${rkey}' not found and collection '${collection}' ${collectionExists ? 'is empty' : 'does not exist'}. Showing profile with available collections instead.`
      }
    });
  } else {
    // Everything failed, return the original record error
    return NextResponse.json(
      { 
        error: recordError,
        fallbackAttempted: true,
        fallbackErrors: {
          record: recordError,
          collection: collectionResult.success ? 'Collection is empty' : collectionResult.error,
          profile: profileResult.error
        }
      },
      { status: 404 }
    );
  }
}

/**
 * Enriches profile records with additional handle information
 */
async function enrichProfileRecord(pds: string, did: string, recordResult: any) {
  try {
    // Try to get the repo info to get the handle
    const describeUrl = new URL(`/xrpc/com.atproto.repo.describeRepo`, pds);
    describeUrl.searchParams.set('repo', did);
    const describeResponse = await fetch(describeUrl.toString());
    
    if (describeResponse.ok) {
      const repoInfo = await describeResponse.json();
      if (repoInfo.handle) {
        recordResult.data.handle = repoInfo.handle;
      }
    }
  } catch (error) {
    console.error('Error fetching repo info for profile record:', error);
  }
}