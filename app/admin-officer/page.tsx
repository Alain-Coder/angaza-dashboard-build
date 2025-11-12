'use client'

import { RoleBasedLayout } from "@/components/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, Building, FileText, Shield, Settings } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function AdminOfficerPage() {
  return (
    <ProtectedRoute requiredRole={['admin officer']}>
      <RoleBasedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Administrative operations and staff management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Staff Members</CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">145</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-primary font-medium">8</span> new this quarter
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Upcoming Events</CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">12</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-primary font-medium">3</span> this week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Bookings</CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">24</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-destructive font-medium">5</span> pending approval
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Pending Requests</CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">18</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-destructive font-medium">7</span> require attention
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Recent Staff Actions</CardTitle>
                <CardDescription>Latest personnel activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">New Hire: Sarah Johnson</p>
                      <p className="text-sm text-muted-foreground">Community Outreach Officer</p>
                      <p className="text-xs text-muted-foreground">Added today</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Leave Request Approved</p>
                      <p className="text-sm text-muted-foreground">James Mwale - Oct 10-15</p>
                      <p className="text-xs text-muted-foreground">Approved yesterday</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                      <Settings className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Performance Review Completed</p>
                      <p className="text-sm text-muted-foreground">Dr. Grace Phiri</p>
                      <p className="text-xs text-muted-foreground">Completed 2 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Upcoming Events</CardTitle>
                <CardDescription>Organization calendar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Board Meeting</p>
                      <p className="text-sm text-muted-foreground">Quarterly Review</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Sep 30, 2024</p>
                      <p className="text-xs text-primary font-medium">10:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Staff Training</p>
                      <p className="text-sm text-muted-foreground">Data Management</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Oct 5, 2024</p>
                      <p className="text-xs text-primary font-medium">2:00 PM</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Annual Gala</p>
                      <p className="text-sm text-muted-foreground">Fundraising Event</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Oct 20, 2024</p>
                      <p className="text-xs text-primary font-medium">6:00 PM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}