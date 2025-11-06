import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This is a placeholder!!!! - Next.js middleware doesn't have access to Firebase auth state!!! We handle authentication in the components using the AuthContext - Mahdi please try to clean up or fix
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
