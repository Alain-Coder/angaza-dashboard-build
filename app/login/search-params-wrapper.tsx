'use client'

import { useSearchParams } from 'next/navigation'
import LoginFormContent from './login-form-content'

export default function SearchParamsWrapper() {
  const searchParams = useSearchParams()
  
  if (!searchParams) {
    return <LoginFormContent redirectUrl={null} />
  }
  
  const redirectUrl = searchParams.get('redirect')
  return <LoginFormContent redirectUrl={redirectUrl || null} />
}