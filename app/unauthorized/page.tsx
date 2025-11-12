'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function UnauthorizedPage() {
  const router = useRouter()
  const { user } = useAuth()

  const handleGoBack = () => {
    router.back()
  }

  const handleGoHome = () => {
    // Redirect to user's dashboard based on their role
    if (user?.role) {
      switch (user.role) {
        case 'system admin':
          router.push('/system-admin')
          break
        case 'board':
          router.push('/board')
          break
        case 'executive director':
          router.push('/executive-director')
          break
        case 'finance lead':
          router.push('/finance-lead')
          break
        case 'programs lead':
          router.push('/programs-lead')
          break
        case 'project officer':
          router.push('/project-officer')
          break
        case 'office assistant':
          router.push('/office-assistant')
          break
        default:
          router.push('/dashboard')
      }
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view this page.
          </p>
        </div>
        
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="text-left space-y-2">
            <p>
              Your current role <span className="font-semibold">({user?.role || 'Unknown'})</span> does not have access to this resource.
            </p>
            <p>
              If you believe this is an error, please contact your system administrator.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleGoBack} variant="outline">
            Go Back
          </Button>
          <Button onClick={handleGoHome}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}