import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { UserService } from '@/lib/db-operations'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const members = await UserService.getUsersByFamilyId(session.user.family_id)
    
    // Don't expose password hashes
    const safeMembers = members.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      created_at: member.created_at
    }))

    return NextResponse.json({ members: safeMembers })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Failed to get family members' }, { status: 500 })
  }
}