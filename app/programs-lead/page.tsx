'use client'

import { RoleBasedLayout } from "@/components/role-based-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import ProgramsLeadPageContent from './page-content'

export default function ProgramsLeadPage() {
  return (
    <ProtectedRoute requiredRole={['programs lead']}>
      <RoleBasedLayout>
        <ProgramsLeadPageContent />
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}
