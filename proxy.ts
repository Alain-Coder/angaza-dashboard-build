import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of public paths that don't require authentication
const publicPaths = ['/login', '/', '/unauthorized']

// Helper function to check if a path is public
function isPublicPath(pathname: string): boolean {
  return publicPaths.includes(pathname)
}

// Proxy function for Next.js 13+
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow access to public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }
  
  // For API routes, allow access (handled by route handlers)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // Since we can't reliably verify Firebase tokens in proxy (due to Edge Runtime limitations),
  // we'll pass through all requests and let client-side auth handle protection
  // This is a common pattern for Firebase + Next.js apps
  return NextResponse.next()
}

// Configure which paths the proxy should run on
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}