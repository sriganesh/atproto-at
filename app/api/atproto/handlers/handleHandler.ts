import { NextResponse } from 'next/server';
import { isHandle, resolveHandle, resolveDid, fetchProfile, fetchPlcLog } from '@/lib/edge-atproto';

/**
 * Handles requests for AT Protocol handles (e.g., username.bsky.social)
 * Resolves the handle to a DID and fetches the profile
 */
export async function handleHandleRequest(handle: string) {
  // Resolve handle to DID
  const did = await resolveHandle(handle);
  
  if (!did) {
    return NextResponse.json(
      { error: `Could not resolve handle: ${handle}` },
      { status: 404 }
    );
  }
  
  // Redirect to profile view
  const profileUri = `at://${did}`;
  const pds = await resolveDid(did);
  
  if (!pds) {
    return NextResponse.json(
      { error: `Could not resolve DID: ${did}` },
      { status: 404 }
    );
  }
  
  // Fetch profile data
  const profileResult = await fetchProfile(pds, did);
  
  if (!profileResult.success) {
    return NextResponse.json(
      { error: profileResult.error },
      { status: 404 }
    );
  }
  
  // Fetch PLC log for handle
  let plcLogData = null;
  try {
    const plcLogResult = await fetchPlcLog(did);
    if (plcLogResult.success) {
      plcLogData = plcLogResult.data;
    } else {
      console.error(`Failed to fetch PLC log for handle: ${plcLogResult.error}`);
    }
  } catch (err) {
    console.error('Failed to fetch PLC log for handle:', err);
  }
  
  return NextResponse.json({
    type: 'profile',
    uri: profileUri,
    apiUrl: profileResult.url,
    data: profileResult.data,
    plcLog: plcLogData
  });
}