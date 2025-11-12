'use client'

import { AngazaDashboard } from "@/components/angaza-dashboard"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { BarChart3 } from "lucide-react"
import { usePathname } from 'next/navigation'

export default function DashboardPage() {
  const pathname = usePathname()
  
  // For the main dashboard route, show the full dashboard
  if (pathname === '/dashboard') {
    return (
      <ProtectedRoute>
        <AngazaDashboard />
      </ProtectedRoute>
    )
  }
  
  // For other routes, use the role-based layout
  return (
    <ProtectedRoute>
      <RoleBasedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Access different sections using the sidebar navigation</p>
          </div>
          <div className="bg-card border-border shadow-md rounded-lg p-6">
            <p className="text-muted-foreground">Select an option from the sidebar to view content.</p>
          </div>
        </div>
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}