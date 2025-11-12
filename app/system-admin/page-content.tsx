'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UserManagementContent from './user-management'
import AuditLogsContent from './audit-logs'
import AttendanceAnalyticsContent from './attendance-analytics'
import DepartmentManagementContent from './department-management'
import { Button } from '@/components/ui/button'
import { BarChart, Users, Building } from 'lucide-react'
import Link from 'next/link'

export default function SystemAdminPageContent() {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground">System settings, user management, and audit logs</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 bg-muted/20 border-border">
          <TabsTrigger value="users" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer">
            User Management
          </TabsTrigger>
          <TabsTrigger value="departments" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer">
            Departments
          </TabsTrigger>
          <TabsTrigger value="audit" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer">
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="attendance" className="font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-800/50 cursor-pointer">
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 pt-4">
          <UserManagementContent />
        </TabsContent>

        <TabsContent value="departments" className="space-y-4 pt-4">
          <DepartmentManagementContent />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4 pt-4">
          <AuditLogsContent />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4 pt-4">
          <AttendanceAnalyticsContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}