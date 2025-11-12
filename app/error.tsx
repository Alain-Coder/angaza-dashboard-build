'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong!</h1>
        <p className="text-muted-foreground mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  )
}