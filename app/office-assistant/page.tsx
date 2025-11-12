'use client'

import { RoleBasedLayout } from "@/components/role-based-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import OfficeAssistantPageContent from './page-content'

export default function OfficeAssistantPage() {
  return (
    <ProtectedRoute requiredRole={['office assistant']}>
      <RoleBasedLayout>
        <OfficeAssistantPageContent />
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}