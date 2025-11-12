'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { useAuth } from '@/contexts/auth-context'
import { FinanceDashboard } from './components/finance-dashboard'
import { ExecutiveDirectorDashboard } from './components/executive-director-dashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'
import { FinanceLeadDashboard } from '@/app/finance-lead/finance-lead-dashboard'

export default function FinancePage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Check if user has access to finance module
  const hasFinanceAccess = user?.role && [
    'executive director',
    'finance lead',
    'programs lead',
    'project officer',
    'office assistant'
  ].includes(user.role)

  if (!hasFinanceAccess) {
    return (
      <ProtectedRoute>
        <RoleBasedLayout>
          <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
              <CardDescription>You don't have permission to access the finance module</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Access Restricted</AlertTitle>
                <AlertDescription>
                  Your role ({user?.role || 'Unknown'}) does not have access to the finance module. 
                  Please contact your system administrator if you believe this is an error.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </RoleBasedLayout>
      </ProtectedRoute>
    )
  }

  // Roles that should see the Executive Director dashboard
  const executiveDashboardRoles = ['executive director', 'board']
  
  // Check if user should see the Finance Lead dashboard
  const shouldSeeFinanceLeadDashboard = user?.role === 'finance lead'
  
  // Check if user should see the Executive Director dashboard
  const shouldSeeExecutiveDashboard = user?.role && executiveDashboardRoles.includes(user.role)

  return (
    <ProtectedRoute>
      <RoleBasedLayout>
        {shouldSeeFinanceLeadDashboard ? (
          <FinanceLeadDashboard />
        ) : shouldSeeExecutiveDashboard ? (
          <ExecutiveDirectorDashboard />
        ) : (
          <FinanceDashboard />
        )}
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}