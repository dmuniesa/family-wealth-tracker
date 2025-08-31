import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const response = NextResponse.json({ user: null });
    const session = await getSession(request, response);
    
    console.log('Session check - has user:', !!session.user);
    console.log('Cookies:', request.cookies.toString());
    
    if (!session.user) {
      console.log('No user in session, returning 401');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', session.user.email);
    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}