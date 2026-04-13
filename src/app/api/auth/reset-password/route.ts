import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PasswordResetService } from '@/lib/password-reset-service';

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { token, newPassword } = result.data;

    // Reset the password
    const resetResult = await PasswordResetService.resetPassword(token, newPassword);

    if (!resetResult.success) {
      return NextResponse.json(
        { error: resetResult.error || 'Failed to reset password' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}