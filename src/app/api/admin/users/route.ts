import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@/lib/db-operations';
import { getSession, hashPassword } from '@/lib/auth';
import type { UserRole } from '@/types';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['administrator', 'user', 'guest']).default('user'),
});

const updateUserSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['administrator', 'user', 'guest']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await UserService.isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all users in the database (admin can see all users)
    const users = await UserService.getAllUsers();
    
    // Remove password hashes from response
    const safeUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      family_id: user.family_id,
      role: user.role,
      created_at: user.created_at,
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await UserService.isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);
    const { email, password, name, role } = validatedData;

    // Check if email already exists
    const existingUser = await UserService.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user in same family as admin
    const userId = await UserService.createUser(
      email, 
      passwordHash, 
      name, 
      session.user.family_id, 
      role
    );

    return NextResponse.json({ 
      message: 'User created successfully', 
      userId,
      user: {
        id: userId,
        email,
        name,
        family_id: session.user.family_id,
        role,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const isAdmin = await UserService.isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);
    const { id, email, name, role } = validatedData;

    // Get the user to verify they exist
    const targetUser = await UserService.getUserById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admin can manage users in any family, but warn if different family
    if (targetUser.family_id !== session.user.family_id) {
      console.log(`Admin ${session.user.id} managing user ${id} from different family (${targetUser.family_id} vs ${session.user.family_id})`);
    }

    // Prevent admin from demoting themselves
    if (id === session.user.id && role && role !== 'administrator') {
      return NextResponse.json(
        { error: 'Cannot change your own administrator role' },
        { status: 400 }
      );
    }

    // Check email uniqueness if changing email
    if (email && email !== targetUser.email) {
      const existingUser = await UserService.getUserByEmail(email);
      if (existingUser && existingUser.id !== id) {
        return NextResponse.json(
          { error: 'Email already in use by another user' },
          { status: 400 }
        );
      }
    }

    // Update user fields
    const updates: any = {};
    if (email) updates.email = email;
    if (name) updates.name = name;
    if (role) updates.role = role;

    // Apply updates (you'll need to add this method to UserService)
    if (Object.keys(updates).length > 0) {
      await UserService.updateUser(id, updates);
    }

    // Get updated user
    const updatedUser = await UserService.getUserById(id);
    
    return NextResponse.json({ 
      message: 'User updated successfully',
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        family_id: updatedUser!.family_id,
        role: updatedUser!.role,
        created_at: updatedUser!.created_at,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}