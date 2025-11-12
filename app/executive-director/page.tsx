'use client'

import { RoleBasedLayout } from "@/components/role-based-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import ExecutiveDirectorPageContent from './page-content'

export default function ExecutiveDirectorPage() {
  return (
    <ProtectedRoute requiredRole={['executive director']}>
      <RoleBasedLayout>
        <ExecutiveDirectorPageContent />
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}