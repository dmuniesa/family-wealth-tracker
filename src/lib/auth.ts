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
  password: process.env.SESSION_SECRET || "default-dev-secret-32-chars-long!!",
  cookieName: "wealth-tracker-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
    sameSite: "lax" as const,
    path: "/",
  },
};

console.log('Session config - NODE_ENV:', process.env.NODE_ENV);
console.log('Session config - SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
console.log('Session config - SESSION_SECRET length:', process.env.SESSION_SECRET?.length);

export async function getSession(req: NextRequest, res?: NextResponse): Promise<AuthSession> {
  const response = res || new NextResponse();
  return await getIronSession<AuthSession>(req, response, sessionOptions);
}

export function generateFamilyId(): number {
  return Math.floor(Math.random() * 1000000) + 1;
}