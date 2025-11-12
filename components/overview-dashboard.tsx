'use client'

import { useState, useEffect } from "react"
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  DollarSign, 
  Users, 
  FolderOpen, 
  Calendar, 
  Layers,
  Handshake,
  FileText,
  Activity,
  Target,
  BarChart3,
  UserCheck,
  MapPin,
  Zap,
  Plus,
  Package,
  Banknote
} from "lucide-react"

interface OverviewDashboardProps {
  roleName: string
}

interface Donation {
  id: string
  donor: string
  amount: number
  method: string
  project: string
  date: string
  status: string
  createdAt?: Date
}

interface Project {
  id: string
  name: string
  description: string
  status: 'planning' | 'active' | 'completed' | 'on-hold'
  budget: number
  spent: number
  startDate: Date
  endDate: Date
  createdAt: Date
  updatedAt: Date
}

interface Beneficiary {
  id: string
  name: string
  age: number
  gender: string
  community: string
  status: string
  programIds?: string[]
  createdAt?: Date
}

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  department?: string
  position?: string
  status: string
  phoneNumber?: string
  address?: string
  dateOfBirth?: Date
  hireDate?: Date
  isSystemUser?: boolean
  createdAt?: Date
}

interface Program {
  id: string
  name: string
  description: string
  projectId: string
  budget: number
  startDate: Date
  endDate: Date
  progress: number
  staffCount: number
  status: string
  createdAt?: Date
  updatedAt?: Date
}

interface Partner {
  id: string
  name: string
  type: string
  contactPerson: string
  email: string
  phone: string
  address: string
  website: string
  description: string
  activeProjects: number
  lastContact: string
  status: string
}

interface ActivityItem {
  action: string
  amount?: string
  project?: string
  name?: string
  program?: string
  time: string
  type: string
}

export function OverviewDashboard({ roleName }: OverviewDashboardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [donations, setDonations] = useState<Donation[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

  // Determine which dashboard to show based on role
  const isExecutive = roleName === "Executive Director" || roleName === "Board Member"
  const isFinanceRole = roleName === "Finance Lead"

  // Quick action handlers
  const handleCreateProject = () => {
    router.push('/projects')
  }

  const handleFinance = () => {
    router.push('/finance')
  }

  const handleAddBeneficiary = () => {
    router.push('/beneficiaries')
  }

  const handleViewResources = () => {
    router.push('/resources')
  }

  const handleViewFiles= () => {
    router.push('/files')
  }

  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Create an array of fetch promises
        const fetchPromises = [
          fetch('/api/donations'),
          fetch('/api/projects'),
          fetch('/api/beneficiaries'),
          fetch('/api/staff'),
          fetch('/api/programs'),
          fetch('/api/partners/simple')
        ];
        
        // Execute all fetch requests in parallel
        const responses = await Promise.all(fetchPromises);
        
        // Parse all JSON responses with individual error handling
        const [
          donationsData,
          projectsData,
          beneficiariesData,
          staffData,
          programsData,
          partnersData
        ] = await Promise.all(
          responses.map(async (response, index) => {
            try {
              if (!response.ok) {
                console.warn(`API request failed for endpoint ${index}: ${response.status} ${response.statusText}`);
                return []; // Return empty array for failed requests
              }
              const data = await response.json();
              return data;
            } catch (error) {
              console.warn(`Failed to parse JSON for endpoint ${index}:`, error);
              return []; // Return empty array for parsing errors
            }
          })
        );
        
        // Set state for all data, using fallback empty arrays
        setDonations(donationsData?.donations || [])
        setProjects(projectsData?.projects || [])
        setBeneficiaries(beneficiariesData?.beneficiaries || [])
        setStaff(staffData?.staff || [])
        setPrograms(programsData?.programs || [])
        setPartners(partnersData?.partners || [])
        
        // Create activity data based on real data
        const activityData: ActivityItem[] = []
        
        // Add recent donations
        if (donationsData?.donations && donationsData.donations.length > 0) {
          // Sort donations by createdAt descending
          const sortedDonations = [...donationsData.donations].sort((a: Donation, b: Donation) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          const recentDonations = sortedDonations.slice(0, 2)
          recentDonations.forEach((donation: Donation) => {
            activityData.push({
              action: "New donation received",
              amount: `MWK${donation.amount.toLocaleString()}`,
              time: getTimeAgo(donation.createdAt),
              type: "donation",
            })
          })
        }
        
        // Add recent projects
        if (projectsData?.projects && projectsData.projects.length > 0) {
          // Sort projects by updatedAt descending
          const sortedProjects = [...projectsData.projects].sort((a: Project, b: Project) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return dateB - dateA;
          });
          
          const recentProjects = sortedProjects.slice(0, 2)
          recentProjects.forEach((project: Project) => {
            activityData.push({
              action: "Project updated",
              project: project.name,
              time: getTimeAgo(project.updatedAt),
              type: "project",
            })
          })
        }
        
        // Add recent beneficiaries
        if (beneficiariesData?.beneficiaries && beneficiariesData.beneficiaries.length > 0) {
          // Sort beneficiaries by createdAt descending
          const sortedBeneficiaries = [...beneficiariesData.beneficiaries].sort((a: Beneficiary, b: Beneficiary) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          const recentBeneficiaries = sortedBeneficiaries.slice(0, 1)
          recentBeneficiaries.forEach((beneficiary: Beneficiary) => {
            activityData.push({
              action: "New beneficiary registered",
              name: beneficiary.name,
              time: getTimeAgo(beneficiary.createdAt),
              type: "beneficiary",
            })
          })
        }
        
        // Add recent staff
        if (staffData?.staff && staffData.staff.length > 0) {
          // Sort staff by createdAt descending
          const sortedStaff = [...staffData.staff].sort((a: StaffMember, b: StaffMember) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          const recentStaff = sortedStaff.slice(0, 1)
          recentStaff.forEach((staffMember: StaffMember) => {
            activityData.push({
              action: "New staff member added",
              name: staffMember.name,
              time: getTimeAgo(staffMember.createdAt),
              type: "staff",
            })
          })
        }
        
        // Add recent programs
        if (programsData?.programs && programsData.programs.length > 0) {
          // Sort programs by createdAt descending
          const sortedPrograms = [...programsData.programs].sort((a: Program, b: Program) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });
          
          const recentPrograms = sortedPrograms.slice(0, 1)
          recentPrograms.forEach((program: Program) => {
            activityData.push({
              action: "New program launched",
              program: program.name,
              time: getTimeAgo(program.createdAt),
              type: "program",
            })
          })
        }
        
        // Sort all activity by time (most recent first)
        activityData.sort((a, b) => {
          // Convert time strings to comparable values (simplified approach)
          const timeA = a.time.includes('minute') ? 1 : 
                       a.time.includes('hour') ? 2 : 
                       a.time.includes('day') ? 3 : 4;
          const timeB = b.time.includes('minute') ? 1 : 
                       b.time.includes('hour') ? 2 : 
                       b.time.includes('day') ? 3 : 4;
          return timeA - timeB;
        });
        
        // Limit to 5 items total
        const limitedActivityData = activityData.slice(0, 5)
        setRecentActivity(limitedActivityData)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        // Set default activity if there's an error
        setRecentActivity([
          {
            action: "System initialized",
            time: "Just now",
            type: "system",
          },
          {
            action: "Dashboard loaded",
            time: "Just now",
            type: "system",
          },
          {
            action: "Data synchronization",
            time: "Just now",
            type: "system",
          },
          {
            action: "User activity",
            time: "Just now",
            type: "system",
          },
          {
            action: "System update",
            time: "Just now",
            type: "system",
          }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper function to calculate time ago
  const getTimeAgo = (date: Date | string | undefined) => {
    if (!date) return "Unknown time"
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) {
      return `Just now`
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`
    } else {
      return `${diffDays} days ago`
    }
  }

  // Calculate dashboard metrics
  const totalDonations = donations.reduce((sum, donation) => sum + donation.amount, 0)
  const activeProjects = projects.filter(project => project.status === 'active').length
  const totalBeneficiaries = beneficiaries.length
  const communitiesReached = new Set(beneficiaries.map(b => b.community)).size
  const activeStaff = staff.filter(staffMember => staffMember.status === 'Active').length
  const activePrograms = programs.filter(program => program.status === 'active').length
  const activePartners = partners.filter(partner => partner.status === 'Active').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Main metrics based on role */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-primary">
              {isFinanceRole ? "Total Donations" : "Active Projects"}
            </CardTitle>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              {isFinanceRole ? (
                <DollarSign className="h-4 w-4 text-primary" />
              ) : (
                <FolderOpen className="h-4 w-4 text-primary" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isFinanceRole ? (
                `MWK${totalDonations.toLocaleString()}`
              ) : (
                activeProjects
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isFinanceRole && isExecutive ? (
                <>
                  <span className="text-primary font-medium">+12%</span> from last month
                </>
              ) : (
                <>
                  <span className="text-primary font-medium">
                    {projects.filter(p => p.status === 'completed').length} completed
                  </span> this month
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-primary">
              {isFinanceRole && isExecutive ? "Active Projects" : "Beneficiaries"}
            </CardTitle>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              {isFinanceRole && isExecutive ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Users className="h-4 w-4 text-primary" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isFinanceRole && isExecutive ? activeProjects : totalBeneficiaries}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isFinanceRole && isExecutive ? (
                <>
                  <span className="text-primary font-medium">
                    {projects.filter(p => p.status === 'completed').length} completed
                  </span> this month
                </>
              ) : (
                <>
                  <span className="text-primary font-medium">{communitiesReached} communities</span> reached
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-primary">
              {isFinanceRole && isExecutive ? "Active Programs" : "Active Staff"}
            </CardTitle>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              {isFinanceRole && isExecutive ? (
                <Layers className="h-4 w-4 text-primary" />
              ) : (
                <UserCheck className="h-4 w-4 text-primary" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isFinanceRole && isExecutive ? activePrograms : activeStaff}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isFinanceRole && isExecutive ? (
                <>
                  <span className="text-primary font-medium">
                    {programs.filter(p => p.status === 'planning').length} in planning
                  </span>
                </>
              ) : (
                <>
                  <span className="text-primary font-medium">
                    {staff.filter(s => s.isSystemUser).length} system users
                  </span> in organization
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-primary">
              {isFinanceRole && isExecutive ? "Active Partners" : "Programs"}
            </CardTitle>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              {isFinanceRole && isExecutive ? (
                <Handshake className="h-4 w-4 text-primary" />
              ) : (
                <Layers className="h-4 w-4 text-primary" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {isFinanceRole && isExecutive ? activePartners : activePrograms}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isFinanceRole && isExecutive ? (
                <>
                  <span className="text-primary font-medium">+3</span> new this quarter
                </>
              ) : (
                <>
                  <span className="text-primary font-medium">
                    {programs.filter(p => p.status === 'planning').length} in planning
                  </span>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="text-lg font-bold text-foreground flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((activity, index) => (
                  <div
                    key={index}
                    className="p-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            activity.type === "donation"
                              ? "bg-primary"
                              : activity.type === "project"
                                ? "bg-secondary"
                                : activity.type === "beneficiary"
                                  ? "bg-green-500"
                                  : activity.type === "staff"
                                    ? "bg-blue-500"
                                    : activity.type === "program"
                                      ? "bg-purple-500"
                                      : "bg-gray-500"
                          }`}
                        ></div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.amount || activity.project || activity.name || activity.program}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{activity.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="text-lg font-bold text-foreground flex items-center">
              <Target className="w-5 h-5 mr-2 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <Button
              className="w-full justify-start font-medium bg-transparent border border-border hover:bg-muted/50 hover:text-foreground cursor-pointer"
              variant="outline"
              onClick={handleCreateProject}
            >
              <Plus className="w-4 h-4 mr-2 text-muted-foreground" />
              {isFinanceRole && isExecutive ? "Create New Projects" : "View Projects"}
            </Button>
            <Button
              className="w-full justify-start font-medium bg-transparent border border-border hover:bg-muted/50 hover:text-foreground cursor-pointer"
              variant="outline"
              onClick={handleFinance}
            >
              <Banknote className="w-4 h-4 mr-2 text-muted-foreground" />
              {isFinanceRole && isExecutive ? "View Finances" : "View Finances"}
            </Button>
            <Button
              className="w-full justify-start font-medium bg-transparent border border-border hover:bg-muted/50 hover:text-foreground cursor-pointer"
              variant="outline"
              onClick={handleAddBeneficiary}
            >
              <UserCheck className="w-4 h-4 mr-2 text-muted-foreground" />
              {isFinanceRole && isExecutive ? "Manage Beneficiaries" : "View Beneficiaries"}
            </Button>
            <Button
              className="w-full justify-start font-medium bg-transparent border border-border hover:bg-muted/50 hover:text-foreground cursor-pointer"
              variant="outline"
              onClick={handleViewResources}
            >
              <Package className="w-4 h-4 mr-2 text-muted-foreground cursor-pointer" />
              View Resources
            </Button>
            <Button
              className="w-full justify-start font-medium bg-transparent border border-border hover:bg-muted/50 hover:text-foreground cursor-pointer"
              variant="outline"
              onClick={handleViewFiles}
            >
              <FileText className="w-4 h-4 mr-2 text-muted-foreground cursor-pointer" />
              View Files
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}