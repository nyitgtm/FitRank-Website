import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/admin/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Accept either an email or a userId. Prefer `email` if provided.
    const { email, userId } = await request.json();

    let targetEmail: string | undefined = email;

    if (!targetEmail && !userId) {
      return NextResponse.json({ error: 'Either email or userId is required' }, { status: 400 });
    }

    if (!targetEmail && userId) {
      const auth = getAdminAuth();
      const userRecord = await auth.getUser(userId);
      targetEmail = userRecord.email || undefined;
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'Could not determine an email address for the user' }, { status: 400 });
    }

    // Send password reset email using Firebase Identity Toolkit
    const apiKey = process.env.FIREBASE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'FIREBASE_API_KEY is not configured' },
        { status: 500 }
      );
    }

    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email: targetEmail,
            continueUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Firebase sendOobCode error:', data);
        return NextResponse.json(
          { error: 'Failed to send password reset email', detail: data },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Password reset email sent to ${targetEmail}`,
        email: targetEmail,
      });
    } catch (err: any) {
      console.error('Error calling Firebase sendOobCode:', err);
      return NextResponse.json(
        { error: 'Failed to contact Firebase service', detail: String(err) },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error sending password reset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send password reset email' },
      { status: 500 }
    );
  }
}
