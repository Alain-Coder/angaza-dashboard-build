'use client'

import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string[]
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      // If user is not authenticated, redirect to login
      console.log('User not authenticated, redirecting to login')
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Check if user has required role
  if (requiredRole && requiredRole.length > 0) {
    // If user role is undefined, redirect to login
    if (user.role === undefined) {
      console.log('User role is undefined, redirecting to login')
      router.push('/login')
      return null
    }
    
    // Check if user has required role
    if (!requiredRole.includes(user.role)) {
      console.log('Access denied. User role:', user.role, 'Required roles:', requiredRole)
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You don't have permission to view this page. Please contact your administrator.
            </p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
          </div>
        </div>
      )
    }
  }

  console.log('Access granted. User role:', user.role)
  return <>{children}</>
}