'use client'

import { RoleBasedLayout } from "@/components/role-based-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MapPin, MessageSquare, Heart, Calendar, TrendingUp } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function CommunityOutreachOfficerPage() {
  return (
    <ProtectedRoute requiredRole={['community outreach officer']}>
      <RoleBasedLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Community Outreach Dashboard</h1>
            <p className="text-muted-foreground">Community engagement and relationship management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Communities Engaged</CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">47</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-primary font-medium">3</span> new this quarter
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Beneficiaries</CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">2,847</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-primary font-medium">+156</span> this month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Community Feedback</CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">89</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-primary font-medium">12</span> unresolved
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Engagement Rate</CardTitle>
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">78%</div>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="text-primary font-medium">+5%</span> from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Recent Community Interactions</CardTitle>
                <CardDescription>Latest outreach activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Lilongwe Community Meeting</p>
                      <p className="text-sm text-muted-foreground">Discussed solar program expansion</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">New Beneficiary Registration</p>
                      <p className="text-sm text-muted-foreground">12 families added in Nsanje</p>
                      <p className="text-xs text-muted-foreground">Yesterday</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Feedback Resolution</p>
                      <p className="text-sm text-muted-foreground">Addressed water access concerns</p>
                      <p className="text-xs text-muted-foreground">2 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Upcoming Engagements</CardTitle>
                <CardDescription>Planned community activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Blantyre Rural Workshop</p>
                      <p className="text-sm text-muted-foreground">Education Program Introduction</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Oct 2, 2024</p>
                      <p className="text-xs text-primary font-medium">9:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Mzuzu Health Camp</p>
                      <p className="text-sm text-muted-foreground">Free Medical Checkups</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Oct 8, 2024</p>
                      <p className="text-xs text-primary font-medium">8:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">Community Feedback Session</p>
                      <p className="text-sm text-muted-foreground">Lilongwe District</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Oct 15, 2024</p>
                      <p className="text-xs text-primary font-medium">3:00 PM</p>
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