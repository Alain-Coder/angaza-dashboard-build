'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      console.log('User object:', user)
      if (!user) {
        router.push('/login')
      } else {
        console.log('User role:', user.role)
        // If user role is undefined, redirect to login
        if (user.role === undefined) {
          router.push('/login')
          return
        }
        
        // Redirect based on user role
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
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return null
}