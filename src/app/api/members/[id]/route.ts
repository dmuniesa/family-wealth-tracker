import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { UserService } from '@/lib/db-operations'

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

    // Prevent users from removing themselves
    if (memberId === session.user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    // Verify the user being removed is in the same family
    const targetUser = await UserService.getUserById(memberId)
    if (!targetUser || targetUser.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'User not found or not in same family' }, { status: 404 })
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