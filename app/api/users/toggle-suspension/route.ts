import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/admin/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { userId, disabled } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (typeof disabled !== 'boolean') {
      return NextResponse.json({ error: 'Disabled must be a boolean' }, { status: 400 });
    }

    // Get Admin Auth instance
    const auth = getAdminAuth();

    // Update user in Firebase Auth
    await auth.updateUser(userId, {
      disabled: disabled
    });

    return NextResponse.json({ 
      success: true, 
      message: `User ${disabled ? 'suspended' : 'activated'} successfully` 
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    
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
      { error: error.message || 'Failed to update user status' },
      { status: 500 }
    );
  }
}
