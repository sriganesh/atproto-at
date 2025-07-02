import { NextRequest, NextResponse } from 'next/server';
import { resolveDid, isHandle } from '@/lib/edge-atproto';
import { cleanInput } from '@/lib/utils/format/string-utils';
import { handleHandleRequest } from './handlers/handleHandler';
import { handleRecordRequest } from './handlers/recordHandler';
import { handleCollectionRequest } from './handlers/collectionHandler';
import { handleProfileRequest } from './handlers/profileHandler';
import { parseAndValidateUri } from './handlers/uriParser';
import { validateApiParams } from './validators/inputValidator';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawUri = searchParams.get('uri');
  const rawCursor = searchParams.get('cursor');
  const rawLimit = searchParams.get('limit');
  
  // Validate and sanitize all input parameters
  const validation = validateApiParams(rawUri, rawCursor, rawLimit);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }
  
  const { uri: uriParam, cursor: cursorParam, limit } = validation.value!;

  // Handle direct handle input (e.g., username.bsky.social)
  if (isHandle(uriParam)) {
    return handleHandleRequest(uriParam);
  }

  // Parse and validate the URI
  const parseResult = await parseAndValidateUri(uriParam);
  
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error },
      { status: 400 }
    );
  }
  
  const { did: resolvedDid, collection: collectionPath, rkey: resolvedRkey } = parseResult.data!;
  
  // Resolve DID to PDS
  const pds = await resolveDid(resolvedDid);
  if (!pds) {
    return NextResponse.json(
      { error: `Could not resolve DID: ${resolvedDid}` },
      { status: 404 }
    );
  }
  
  // Route to appropriate handler based on URI pattern
  if (collectionPath && resolvedRkey) {
    // Case 1: Full record URI - did/collection/rkey
    return handleRecordRequest({
      pds,
      did: resolvedDid,
      collection: collectionPath,
      rkey: resolvedRkey,
      cursorParam,
      limitParam: limit.toString()
    });
  } else if (collectionPath) {
    // Case 2: Collection URI - did/collection
    return handleCollectionRequest({
      pds,
      did: resolvedDid,
      collection: collectionPath,
      cursor: cursorParam,
      limit
    });
  } else {
    // Case 3: Profile URI - did only
    return handleProfileRequest(pds, resolvedDid);
  }
} 