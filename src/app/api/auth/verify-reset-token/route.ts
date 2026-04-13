import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PasswordResetService } from '@/lib/password-reset-service';

const verifyTokenSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = verifyTokenSchema.parse(body);

    const userId = await PasswordResetService.validateResetToken(token);

    return NextResponse.json({
      valid: userId !== null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { valid: false },
        { status: 400 }
      );
    }

    console.error('Verify reset token error:', error);
    return NextResponse.json(
      { valid: false },
      { status: 500 }
    );
  }
}