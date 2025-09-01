import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@/lib/db-operations';
import { getSession, hashPassword } from '@/lib/auth';
import type { UserRole } from '@/types';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['administrator', 'user', 'guest']).optional(),
  password: z.string().refine(
    (val) => val === undefined || val === "" || val.length >= 8,
    { message: "Password must be at least 8 characters or empty" }
  ).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    const user = await UserService.getUserById(userId);
    
    if (!user || user.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return user without password hash
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      family_id: user.family_id,
      role: user.role,
      created_at: user.created_at,
    };

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);
    const { email, name, role, password } = validatedData;

    // Get the user to verify they're in the same family
    const targetUser = await UserService.getUserById(userId);
    if (!targetUser || targetUser.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from demoting themselves
    if (userId === session.user.id && role && role !== 'administrator') {
      return NextResponse.json(
        { error: 'Cannot change your own administrator role' },
        { status: 400 }
      );
    }

    // Check email uniqueness if changing email
    if (email && email !== targetUser.email) {
      const existingUser = await UserService.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
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

    // Update password if provided
    if (password) {
      const passwordHash = await hashPassword(password);
      updates.password_hash = passwordHash;
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      await UserService.updateUser(userId, updates);
    }

    // Get updated user
    const updatedUser = await UserService.getUserById(userId);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);

    // Prevent admin from deleting themselves
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get the user to verify they're in the same family
    const targetUser = await UserService.getUserById(userId);
    if (!targetUser || targetUser.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if this is the only administrator
    const admins = await UserService.getUsersByRole(session.user.family_id, 'administrator');
    if (targetUser.role === 'administrator' && admins.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only administrator. Promote another user first.' },
        { status: 400 }
      );
    }

    // Delete the user
    await UserService.deleteUser(userId);

    return NextResponse.json({ 
      message: 'User deleted successfully',
      deletedUserId: userId 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}