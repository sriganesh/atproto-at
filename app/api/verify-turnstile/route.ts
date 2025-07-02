import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing Turnstile token' },
        { status: 400 }
      );
    }

    // Get the secret key from environment variables
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      console.error('TURNSTILE_SECRET_KEY not found in environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify the token with Cloudflare's siteverify API
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    
    // Optional: Add remote IP for additional security
    const remoteIP = request.headers.get('cf-connecting-ip') || 
                     request.headers.get('x-forwarded-for');
    if (remoteIP) {
      formData.append('remoteip', remoteIP);
    }

    const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const result: TurnstileResponse = await verifyResponse.json();

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Verification successful' 
      });
    } else {
      console.warn('Turnstile verification failed:', result['error-codes']);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Verification failed',
          errorCodes: result['error-codes'] 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Turnstile verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 