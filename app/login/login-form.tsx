import { Suspense } from 'react'
import SearchParamsWrapper from './search-params-wrapper'
import { Loader2 } from 'lucide-react'

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

export default function LoginForm() {
  return (
    <Suspense fallback={<Loading />}> 
      <SearchParamsWrapper />
    </Suspense>
  )
}