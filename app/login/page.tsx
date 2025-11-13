import { Suspense } from 'react'
import LoginForm from './login-form'
import { Loader2 } from 'lucide-react'

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}> 
      <LoginForm />
    </Suspense>
  )
}