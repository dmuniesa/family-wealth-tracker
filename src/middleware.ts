import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'es'],
  defaultLocale: 'en',
  localeDetection: false
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the path already has a locale
  const pathnameHasLocale = ['/en', '/es'].some(
    (locale) => pathname.startsWith(locale)
  );
  
  // If no locale in path, redirect to default locale
  if (!pathnameHasLocale && !pathname.startsWith('/api/')) {
    const locale = request.cookies.get('NEXT_LOCALE')?.value || 'en';
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }
  
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo).*)'
  ]
}