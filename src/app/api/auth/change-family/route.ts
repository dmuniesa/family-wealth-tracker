import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { UserService } from '@/lib/db-operations';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ message: 'Family ID changed successfully' });
    const session = await getSession(request, response);
    
    if (!session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newFamilyId } = await request.json();

    if (!newFamilyId || typeof newFamilyId !== 'number') {
      return NextResponse.json({ error: 'Valid Family ID is required' }, { status: 400 });
    }

    // Check if the new family ID exists
    const familyExists = await UserService.familyExists(newFamilyId);
    if (!familyExists) {
      return NextResponse.json({ error: 'Family ID does not exist' }, { status: 400 });
    }

    // Check if user is trying to switch to the same family
    if (session.user.family_id === newFamilyId) {
      return NextResponse.json({ error: 'You are already in this family' }, { status: 400 });
    }

    // Change the user's family ID
    await UserService.changeFamilyId(session.user.id, newFamilyId);

    // Update the session with new family ID
    session.user.family_id = newFamilyId;
    await session.save?.();

    return response;

  } catch (error) {
    console.error('Change family ID error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}