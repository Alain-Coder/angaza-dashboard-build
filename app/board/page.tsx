'use client'

import { RoleBasedLayout } from "@/components/role-based-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import BoardPageContent from './page-content'

export default function BoardPage() {
  return (
    <ProtectedRoute requiredRole={['board']}>
      <RoleBasedLayout>
        <BoardPageContent />
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}