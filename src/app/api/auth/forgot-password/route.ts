import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@/lib/db-operations';
import { PasswordResetService } from '@/lib/password-reset-service';
import { getUnifiedEmailService } from '@/lib/unified-email-service';
import { resetPasswordEmailTemplate } from '@/lib/email-templates/reset-password-template';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });

    // Find user by email
    const user = await UserService.getUserByEmail(email);
    if (!user) {
      // Don't reveal that the user doesn't exist
      return successResponse;
    }

    // Check if email service is configured
    const emailService = getUnifiedEmailService();
    await emailService.initialize();

    if (!emailService.isConfigured()) {
      console.error('Email service not configured - cannot send reset email');
      return NextResponse.json(
        { error: 'Email service is not configured. Please contact an administrator.' },
        { status: 503 }
      );
    }

    // Generate reset token
    const token = await PasswordResetService.generateResetToken(user.id);
    if (!token) {
      return NextResponse.json(
        { error: 'Failed to generate reset token' },
        { status: 500 }
      );
    }

    // Build reset URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const locale = request.nextUrl.pathname.includes('/es') ? 'es' : 'en';
    const resetUrl = `${appUrl}/${locale}/auth?mode=reset-password&token=${token}`;

    // Send reset email
    const emailTemplate = resetPasswordEmailTemplate({
      userName: user.name,
      resetUrl,
      locale,
    });

    const emailResult = await emailService.sendEmail({
      to: user.email,
      subject: locale === 'en'
        ? 'Family Wealth Tracker - Password Reset'
        : 'Family Wealth Tracker - Restablecimiento de Contraseña',
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again later.' },
        { status: 500 }
      );
    }

    return successResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}