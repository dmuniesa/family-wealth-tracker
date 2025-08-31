import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@/lib/db-operations';
import { hashPassword, generateFamilyId } from '@/lib/auth';
import { SettingsService } from '@/lib/settings-service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  familyId: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check if registration is enabled
    const registrationEnabled = await SettingsService.isRegistrationEnabled()
    if (!registrationEnabled) {
      return NextResponse.json(
        { error: 'User registration is currently disabled' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, familyId } = registerSchema.parse(body);

    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const finalFamilyId = familyId || generateFamilyId();
    
    // New users are created as 'user' role by default
    // First user in a new family becomes administrator  
    const isFirstUser = !familyId || !(await UserService.familyExists(finalFamilyId));
    const userRole = isFirstUser ? 'administrator' : 'user';

    const userId = await UserService.createUser(email, passwordHash, name, finalFamilyId, userRole);

    return NextResponse.json({
      message: 'User created successfully',
      userId,
      familyId: finalFamilyId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}