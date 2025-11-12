'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VolunteersPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new staff page
    router.push('/staff')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
