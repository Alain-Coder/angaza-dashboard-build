'use client'

import { useAuth } from '@/contexts/auth-context'
import { getAllowedTabs } from '@/lib/role-permissions'
import { useEffect, useState } from 'react'

interface ProtectedNavigationProps {
  children: (allowedTabs: string[]) => React.ReactNode
}

export function ProtectedNavigation({ children }: ProtectedNavigationProps) {
  const { user } = useAuth()
  const [allowedTabs, setAllowedTabs] = useState<string[]>([])
  
  useEffect(() => {
    if (user?.role) {
      const tabs = getAllowedTabs(user.role)
      setAllowedTabs(tabs)
    } else {
      setAllowedTabs([])
    }
  }, [user?.role])
  
  return children(allowedTabs)
}