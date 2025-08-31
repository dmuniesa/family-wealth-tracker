import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { UserService } from '@/lib/db-operations'
import { canDeleteUser, canChangeUserRole, PermissionError } from '@/lib/permissions'
import type { UserRole } from '@/types'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const memberId = parseInt(id)

    // Verify the user being removed exists and is in the same family
    const targetUser = await UserService.getUserById(memberId)
    if (!targetUser || targetUser.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'User not found or not in same family' }, { status: 404 })
    }

    // Check permissions to delete user
    if (!canDeleteUser(session.user, targetUser)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to remove this user' 
      }, { status: 403 })
    }

    await UserService.deleteUser(memberId)
    
    return NextResponse.json({ 
      message: 'User removed successfully' 
    })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to remove member' 
    }, { status: 500 })
  }
}

const updateMemberSchema = z.object({
  role: z.enum(['administrator', 'user', 'guest'])
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    const memberId = parseInt(id)
    const body = await request.json()
    const { role } = updateMemberSchema.parse(body)

    // Verify the user being updated exists and is in the same family
    const targetUser = await UserService.getUserById(memberId)
    if (!targetUser || targetUser.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'User not found or not in same family' }, { status: 404 })
    }

    // Check permissions to change user role
    if (!canChangeUserRole(session.user, targetUser)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to change user role' 
      }, { status: 403 })
    }

    await UserService.updateUserRole(memberId, role as UserRole)
    
    return NextResponse.json({ 
      message: 'User role updated successfully',
      userId: memberId,
      newRole: role
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Update member role error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update member role' 
    }, { status: 500 })
  }
}