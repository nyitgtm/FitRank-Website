import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/admin/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    // Get Admin Auth instance
    const auth = getAdminAuth();

    // Fetch user records from Firebase Auth
    const userStatuses: Record<string, boolean> = {};
    
    for (const userId of userIds) {
      try {
        const userRecord = await auth.getUser(userId);
        userStatuses[userId] = userRecord.disabled || false;
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        userStatuses[userId] = false; // Default to not disabled if error
      }
    }

    return NextResponse.json({ userStatuses });
  } catch (error: any) {
    console.error('Error fetching user statuses:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('Firebase Admin credentials')) {
      return NextResponse.json(
        { 
          error: 'Server configuration error. Firebase Admin SDK is not properly configured.',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user statuses' },
      { status: 500 }
    );
  }
}
