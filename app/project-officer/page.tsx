'use client'

import { RoleBasedLayout } from "@/components/role-based-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import ProjectOfficerPageContent from './page-content'

export default function ProjectOfficerPage() {
  return (
    <ProtectedRoute requiredRole={['project officer']}>
      <RoleBasedLayout>
        <ProjectOfficerPageContent />
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}