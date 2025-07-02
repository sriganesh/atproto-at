import { NextResponse } from 'next/server';
import { fetchProfile, fetchPlcLog } from '@/lib/edge-atproto';

/**
 * Handles requests for AT Protocol profiles
 * Includes PLC log fetching for profile history
 */
export async function handleProfileRequest(pds: string, did: string) {
  const profileResult = await fetchProfile(pds, did);
  
  if (!profileResult.success) {
    return NextResponse.json(
      { error: profileResult.error },
      { status: 404 }
    );
  }
  
  // Fetch PLC log for additional profile history
  let plcLogData = null;
  try {
    const plcLogResult = await fetchPlcLog(did);
    if (plcLogResult.success) {
      plcLogData = plcLogResult.data;
    } else {
      console.error(`Failed to fetch PLC log: ${plcLogResult.error}`);
    }
  } catch (err) {
    console.error('Failed to fetch PLC log:', err);
  }
  
  return NextResponse.json({
    type: 'profile',
    uri: `at://${did}`,
    apiUrl: profileResult.url,
    data: profileResult.data,
    plcLog: plcLogData
  });
}