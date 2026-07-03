import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set([
  '/',
  '/pricing',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/companion',
  '/legacy',
])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/api')) {
    return NextResponse.next()
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
