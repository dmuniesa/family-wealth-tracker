import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { CategoryService } from '@/lib/category-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await CategoryService.seedDefaultCategories(session.user.family_id);
    const categories = await CategoryService.getCategoriesByFamily(session.user.family_id);
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, icon, color, ai_description } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 });
    }

    const id = await CategoryService.createCategory(session.user.family_id, {
      name,
      type,
      icon,
      color,
      ai_description,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
