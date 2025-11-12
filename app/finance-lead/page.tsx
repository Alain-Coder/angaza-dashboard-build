'use client'

import { RoleBasedLayout } from "@/components/role-based-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import FinanceLeadPageContent from './page-content'

export default function FinanceLeadPage() {
  return (
    <ProtectedRoute requiredRole={['finance lead']}>
      <RoleBasedLayout>
        <FinanceLeadPageContent />
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}