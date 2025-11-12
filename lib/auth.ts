import { NextRequest } from 'next/server'

// Simple authentication check for Edge Runtime
export function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get('token')?.value || 
                request.cookies.get('__session')?.value
  return !!token
}

// Simple function to get token from request
export function getToken(request: NextRequest): string | undefined {
  return request.cookies.get('token')?.value || 
         request.cookies.get('__session')?.value
}