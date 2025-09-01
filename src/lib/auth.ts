import bcrypt from 'bcryptjs';
import { getIronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';
import type { AuthSession } from '@/types';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export const sessionOptions = {
  password: (process.env.SESSION_SECRET || "default-dev-secret-32-chars-long!!").substring(0, 32),
  cookieName: "wealth-tracker-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production" && process.env.DISABLE_HTTPS !== "true",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: "lax" as const,
    path: "/",
    // Ensure cookie works across domains/subdomains in production
    ...(process.env.NODE_ENV === "production" && process.env.COOKIE_DOMAIN && {
      domain: process.env.COOKIE_DOMAIN
    })
  },
};

// Debug: Session configuration
if (process.env.NODE_ENV === 'development') {
  console.log('Session config - NODE_ENV:', process.env.NODE_ENV);
  console.log('Session config - SESSION_SECRET length:', process.env.SESSION_SECRET?.length);
  console.log('Session config - Using password length:', (process.env.SESSION_SECRET || "default-dev-secret-32-chars-long!!").substring(0, 32).length);
}

export async function getSession(req: NextRequest, res?: NextResponse): Promise<AuthSession> {
  const response = res || new NextResponse();
  try {
    return await getIronSession<AuthSession>(req, response, sessionOptions);
  } catch (error) {
    console.log('Session decryption error, clearing cookie:', error);
    // Clear the corrupted cookie
    response.cookies.set(sessionOptions.cookieName, '', { 
      ...sessionOptions.cookieOptions, 
      maxAge: 0 
    });
    // Return a new empty session
    return await getIronSession<AuthSession>(req, response, sessionOptions);
  }
}

export function generateFamilyId(): number {
  return Math.floor(Math.random() * 1000000) + 1;
}