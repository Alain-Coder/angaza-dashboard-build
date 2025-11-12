'use client'

import { OverviewDashboard } from '@/components/overview-dashboard'

export default function BoardPageContent() {
  return (
    <div className="space-y-6">
      <OverviewDashboard roleName="Board Member" />
    </div>
  )
}
