'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const router = useRouter()
  const { user, handleLogout } = useAuth()

  const handleClick = async () => {
    try {
      await handleLogout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, still redirect to login
      router.push('/login')
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} className="w-full justify-start text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 cursor-pointer">
      <LogOut className="w-4 h-4 mr-2" />
      Logout
    </Button>
  )
}