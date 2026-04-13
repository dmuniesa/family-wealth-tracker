import crypto from 'crypto';
import { getDatabase } from './database';
import { hashPassword } from './auth';

const TOKEN_EXPIRY_HOURS = 1;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class PasswordResetService {
  /**
   * Generate a password reset token for a user.
   * Invalidates all previous tokens for the user.
   * Returns the plain token (to be sent via email) or null if user not found.
   */
  static async generateResetToken(userId: number): Promise<string | null> {
    const db = await getDatabase();

    // Invalidate all previous tokens for this user
    await db.run(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL`,
      [userId]
    );

    // Generate a secure random token
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(plainToken);

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    // Store the hashed token
    await db.run(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [userId, tokenHash, expiresAt]
    );

    return plainToken;
  }

  /**
   * Validate a reset token without consuming it.
   * Returns the user_id if valid, or null if invalid/expired/used.
   */
  static async validateResetToken(token: string): Promise<number | null> {
    const db = await getDatabase();
    const tokenHash = hashToken(token);

    const record = await db.get(
      `SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?`,
      [tokenHash]
    ) as any;

    if (!record) {
      return null;
    }

    // Check if already used
    if (record.used_at) {
      return null;
    }

    // Check if expired
    if (new Date(record.expires_at) < new Date()) {
      return null;
    }

    return record.user_id;
  }

  /**
   * Reset a user's password using a valid reset token.
   * Consumes the token (marks as used).
   * Returns { success: boolean, error?: string }
   */
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const db = await getDatabase();

    // Validate token
    const userId = await this.validateResetToken(token);
    if (!userId) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and mark token as used in a transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Update user password
      await db.run(
        `UPDATE users SET password_hash = ? WHERE id = ?`,
        [passwordHash, userId]
      );

      // Mark token as used
      const tokenHash = hashToken(token);
      await db.run(
        `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ?`,
        [tokenHash]
      );

      // Also invalidate all other tokens for this user
      await db.run(
        `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL`,
        [userId]
      );

      await db.run('COMMIT');
      return { success: true };
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error resetting password:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  /**
   * Clean up expired tokens (can be called periodically).
   */
  static async cleanExpiredTokens(): Promise<void> {
    const db = await getDatabase();
    await db.run(
      `DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP`
    );
  }
}