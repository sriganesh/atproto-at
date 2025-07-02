import { NextResponse } from 'next/server';
import { fetchCollection } from '@/lib/edge-atproto';

interface CollectionHandlerParams {
  pds: string;
  did: string;
  collection: string;
  cursor?: string;
  limit?: number;
}

/**
 * Handles requests for AT Protocol collections
 */
export async function handleCollectionRequest({ 
  pds, 
  did, 
  collection, 
  cursor, 
  limit = 50 
}: CollectionHandlerParams) {
  const collectionResult = await fetchCollection(pds, did, collection, cursor, limit);
  
  if (!collectionResult.success) {
    return NextResponse.json(
      { error: collectionResult.error },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    type: 'collection',
    uri: `at://${did}/${collection}`,
    apiUrl: collectionResult.url,
    data: collectionResult.data
  });
}