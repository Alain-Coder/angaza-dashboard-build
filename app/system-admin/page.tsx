'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { RoleBasedLayoutSystemAdmin } from '@/components/role-based-layout-system-admin'
import SystemAdminPageContent from './page-content'

export default function SystemAdminPage() {
  return (
    <ProtectedRoute requiredRole={['system admin']}>
      <RoleBasedLayoutSystemAdmin>
        <SystemAdminPageContent />
      </RoleBasedLayoutSystemAdmin>
    </ProtectedRoute>
  )
}