'use client'

import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const LoginFormContent = dynamic(() => import('./login-form-content'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})

export default function SearchParamsWrapper() {
  const searchParams = useSearchParams()
  const redirectUrl = searchParams?.get('redirect') || null
  
  return <LoginFormContent redirectUrl={redirectUrl} />
}