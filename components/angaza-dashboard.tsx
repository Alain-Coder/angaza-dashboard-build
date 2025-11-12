"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  DollarSign,
  Zap,
  Heart,
  PlayCircle,
  StopCircle,
  Download,
  Settings,
  Bell,
  BarChart3,
  FolderOpen,
  Calendar,
  MapPin,
  TrendingUp,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Eye,
  Shield,
  CreditCard,
  FileText,
  Building,
  UserCheck,
  PieChart,
  Activity,
  Target,
  AlertTriangle,
  Filter,
  Clock,
  MessageSquare,
  Layers,
  Package,
  Handshake,
  Banknote,
  ArrowUp,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input" // Added for Beneficiary and Partner search

function AngazaDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState<Date | null>(null)
  const [selectedProject, setSelectedProject] = useState("general-work")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [notifications, setNotifications] = useState(3)

  // Mock data for pending liquidations
  const [pendingLiquidationsCount, setPendingLiquidationsCount] = useState(1)
  const hasPendingLiquidations = pendingLiquidationsCount > 0

  const [realTimeData, setRealTimeData] = useState({
    totalDonations: 125000,
    activeProjects: 8,
    volunteers: 45,
    events: 12,
  })

  const handleClockIn = () => {
    setIsClockedIn(true)
    setClockInTime(new Date())
    console.log("[v0] Clock in recorded to Firebase Firestore with project:", selectedProject)
  }

  const handleClockOut = () => {
    setIsClockedIn(false)
    setClockInTime(null)
    setSelectedProject("")
    console.log("[v0] Clock out recorded to Firebase Firestore")
  }

  const handleDonation = () => {
    console.log("[v0] Initiating Pachangu donation flow with Firebase Cloud Functions")
    alert("Pachangu donation integration with Firebase webhook would be implemented here")
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData((prev) => ({
        ...prev,
        totalDonations: prev.totalDonations + Math.floor(Math.random() * 100),
      }))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const navigationItems = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "projects", label: "Projects", icon: FolderOpen },
    { id: "events", label: "Events", icon: Calendar },
    { id: "volunteers", label: "Personnel", icon: Users },
    { id: "donations", label: "Donations", icon: Heart },
    { id: "finance", label: "Finance", icon: DollarSign },
    // { id: "bookings", label: "Bookings", icon: Building },
    { id: "beneficiaries", label: "Beneficiaries", icon: UserCheck },
    // { id: "community-map", label: "Community Map", icon: MapPin },
    { id: "impact", label: "Impact Tracking", icon: TrendingUp },
    { id: "programs", label: "Program Portfolio", icon: Layers },
    { id: "resources", label: "Resource Distribution", icon: Package },
    { id: "partners", label: "Partners", icon: Handshake },
    { id: "grants", label: "Grants & Funding", icon: Banknote },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "admin", label: "Admin", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Left Sidebar Navigation */}
        <div className="w-64 bg-card border-r border-border shadow-lg flex flex-col">
          {/* Logo Header */}
          <div className="p-6 border-b border-border bg-primary/5">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-md">
                <Zap className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Angaza Foundation</h1>
                <p className="text-xs text-muted-foreground font-medium">Empowering Communities</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="flex-1 p-4">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.id}
                    variant={activeTab === item.id ? "default" : "ghost"}
                    className={`w-full justify-start h-11 px-4 font-medium transition-all duration-200 ${
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                        : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Clock In/Out Section */}
          <div className="p-4 border-t border-border bg-primary/5">
            <div className="space-y-3">
              {isClockedIn ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClockOut}
                  className="w-full shadow-sm font-medium"
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Cloc k Out
                </Button>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full shadow-sm font-medium border-primary/30 hover:bg-primary/10 bg-transparent text-primary hover:text-primary"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Clock In
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Clock In</DialogTitle>
                      <DialogDescription>Select a project to associate with your time entry</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="project">Project</Label>
                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general-work">General Work</SelectItem>
                            <SelectItem value="lilongwe-solar">Lilongwe Solar Grid Extension</SelectItem>
                            <SelectItem value="nsanje-rural">Rural Electrification - Nsanje</SelectItem>
                            <SelectItem value="training-center">Solar Training Center</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button 
                        onClick={handleClockIn} 
                        className="w-full"
                        disabled={!selectedProject}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Start Working
                      </Button>
                      {!selectedProject && (
                        <p className="text-sm text-muted-foreground text-center">
                          Please select a project to continue
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {isClockedIn && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <span className="text-xs font-semibold text-primary">Active Session</span>
                  </div>
                  {selectedProject && (
                    <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-primary/30 mb-1">
                      {selectedProject}
                    </Badge>
                  )}
                  <p className="text-xs text-primary/80 font-medium">{clockInTime?.toLocaleTimeString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-background">
          <header className="border-b border-border bg-card shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground capitalize tracking-tight">{activeTab}</h2>
                <p className="text-sm text-muted-foreground font-medium mt-1">Manage your {activeTab} efficiently</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" className="relative hover:bg-primary/5">
                  <Bell className="w-4 h-4" />
                  {notifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
                      {notifications}
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="shadow-sm font-medium border-border hover:bg-primary/5 bg-transparent"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md font-semibold"
                  onClick={handleDonation}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Donate Now
                </Button>
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto p-6 bg-muted/10">
            <div className="container mx-auto max-w-7xl">
              {/* Content based on active tab */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-primary">Total Donations</CardTitle>
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                          ${realTimeData.totalDonations.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center mt-2">
                          <TrendingUp className="w-3 h-3 mr-1 text-primary" />
                          <span className="text-primary font-medium">+12%</span> from last month
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-primary">Active Projects</CardTitle>
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FolderOpen className="h-4 w-4 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{realTimeData.activeProjects}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="text-primary font-medium">3 completing</span> this month
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-primary">Volunteers</CardTitle>
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{realTimeData.volunteers}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="text-primary font-medium">8 active</span> today
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
                        <div className="text-2xl font-bold text-foreground">{realTimeData.events}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="text-primary font-medium">2 this week</span>
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
                          {[
                            {
                              action: "New donation received",
                              amount: "$500",
                              time: "2 minutes ago",
                              type: "donation",
                            },
                            {
                              action: "Project milestone completed",
                              project: "Solar Installation",
                              time: "1 hour ago",
                              type: "project",
                            },
                            {
                              action: "Volunteer registered",
                              name: "Sarah Johnson",
                              time: "3 hours ago",
                              type: "volunteer",
                            },
                            {
                              action: "Event RSVP confirmed",
                              event: "Community Meeting",
                              time: "5 hours ago",
                              type: "event",
                            },
                          ].map((activity, index) => (
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
                                          : activity.type === "volunteer"
                                            ? "bg-primary"
                                            : "bg-secondary"
                                    }`}
                                  ></div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {activity.amount || activity.project || activity.name || activity.event}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium">{activity.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center">
                          <Target className="w-5 h-5 mr-2 text-secondary" />
                          Quick Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 p-4">
                        <Button
                          className="w-full justify-start font-medium bg-transparent border border-border hover:bg-muted/50"
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-2 text-muted-foreground" />
                          Create New Project
                        </Button>
                        <Button
                          className="w-full justify-start font-medium bg-transparent border border-border hover:bg-muted/50"
                          variant="outline"
                        >
                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                          Schedule Event
                        </Button>
                        <Button
                          className="w-full justify-start font-medium bg-transparent border border-border hover:bg-muted/50"
                          variant="outline"
                        >
                          <UserCheck className="w-4 h-4 mr-2 text-muted-foreground" />
                          Add Volunteer
                        </Button>
                        <Button
                          className="w-full justify-start font-medium bg-transparent border border-border hover:bg-muted/50"
                          variant="outline"
                        >
                          <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                          Generate Report
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "projects" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Project Management</h3>
                      <p className="text-muted-foreground">Track and manage all foundation projects</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      New Project
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="border-b border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="secondary" className="text-secondary font-medium">
                            Active
                          </Badge>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground">
                          Lilongwe Solar Grid Extension
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Expanding solar access to 500 households
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1 font-medium">
                              <span>Progress</span>
                              <span>75%</span>
                            </div>
                            <Progress value={75} className="h-2 bg-muted/50" />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Budget</span>
                            <span className="font-medium text-foreground">$45,000 / $60,000</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Timeline</span>
                            <span className="font-medium text-foreground">Dec 2024</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="border-b border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="text-muted-foreground">
                            Planning
                          </Badge>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground">
                          Rural Electrification - Nsanje
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Bringing electricity to remote villages
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1 font-medium">
                              <span>Progress</span>
                              <span>25%</span>
                            </div>
                            <Progress value={25} className="h-2 bg-muted/50" />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Budget</span>
                            <span className="font-medium text-foreground">$12,000 / $80,000</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Timeline</span>
                            <span className="font-medium text-foreground">Mar 2025</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="border-b border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-green-100 text-green-800 font-medium">Completed</Badge>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground">Solar Training Center</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Training facility for solar technicians
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1 font-medium">
                              <span>Progress</span>
                              <span>100%</span>
                            </div>
                            <Progress value={100} className="h-2 bg-muted/50" />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Budget</span>
                            <span className="font-medium text-foreground">$35,000 / $35,000</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Completed</span>
                            <span className="font-medium text-foreground">Oct 2024</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "events" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Event Management</h3>
                      <p className="text-muted-foreground">Manage events with RSVPs and Pachangu ticketing</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      New Event
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="border-b border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="text-secondary font-medium">Upcoming</Badge>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground">Solar Energy Workshop</CardTitle>
                        <CardDescription className="flex items-center text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          Dec 15, 2024 • 9:00 AM
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="text-foreground">Lilongwe Community Center</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">RSVPs</span>
                            <span className="font-medium text-foreground">45 / 60</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Ticket Sales</span>
                            <span className="font-medium text-foreground">$2,250</span>
                          </div>
                          <Button className="w-full font-medium shadow-md" size="sm">
                            Manage Event
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="border-b border-border">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="text-muted-foreground">
                            Draft
                          </Badge>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground">Annual Fundraising Gala</CardTitle>
                        <CardDescription className="flex items-center text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          Jan 20, 2025 • 6:00 PM
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="text-foreground">Blantyre Hotel Conference Center</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Expected Attendees</span>
                            <span className="font-medium text-foreground">200</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Target Revenue</span>
                            <span className="font-medium text-foreground">$15,000</span>
                          </div>
                          <Button
                            className="w-full font-medium bg-transparent border border-border hover:bg-muted/50"
                            size="sm"
                            variant="outline"
                          >
                            Publish Event
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "volunteers" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Personnel Management</h3>
                      <p className="text-muted-foreground">Manage volunteers and full-time staff</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Person
                    </Button>
                  </div>

                  <Tabs defaultValue="volunteers" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/20 border-border">
                      <TabsTrigger value="volunteers" className="font-medium">
                        Volunteers
                      </TabsTrigger>
                      <TabsTrigger value="staff" className="font-medium">
                        Full-time Staff
                      </TabsTrigger>
                      <TabsTrigger value="timesheets" className="font-medium">
                        Timesheets
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="volunteers" className="space-y-4 pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Hours This Month</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Sarah Banda</TableCell>
                            <TableCell className="text-muted-foreground">Community Outreach</TableCell>
                            <TableCell className="text-muted-foreground">32 hours</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">James Mwale</TableCell>
                            <TableCell className="text-muted-foreground">Technical Support</TableCell>
                            <TableCell className="text-muted-foreground">28 hours</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="staff" className="space-y-4 pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Dr. Grace Phiri</TableCell>
                            <TableCell className="text-muted-foreground">Program Director</TableCell>
                            <TableCell className="text-muted-foreground">Operations</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="timesheets" className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-foreground">Timesheet Approvals</h4>
                        <Badge variant="outline" className="text-muted-foreground">
                          3 Pending
                        </Badge>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Person</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Sarah Banda</TableCell>
                            <TableCell className="text-muted-foreground">Dec 10, 2024</TableCell>
                            <TableCell className="text-muted-foreground">8 hours</TableCell>
                            <TableCell className="text-muted-foreground">Lilongwe Solar</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                Pending
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {activeTab === "donations" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Donation Management</h3>
                      <p className="text-muted-foreground">Track donations via Pachangu with real-time updates</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" className="font-medium border-border hover:bg-muted/50 bg-transparent">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </Button>
                      <Button className="font-medium shadow-md">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Manual Entry
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="pb-2 border-b border-border">
                        <CardTitle className="text-sm font-semibold text-primary">Today's Donations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">$1,250</div>
                        <p className="text-xs text-muted-foreground mt-2">8 donations</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="pb-2 border-b border-border">
                        <CardTitle className="text-sm font-semibold text-primary">This Month</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">$12,500</div>
                        <p className="text-xs text-muted-foreground mt-2">156 donations</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardHeader className="pb-2 border-b border-border">
                        <CardTitle className="text-sm font-semibold text-primary">Recurring Donors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">45</div>
                        <p className="text-xs text-muted-foreground mt-2">Monthly subscribers</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-card border-border shadow-md">
                    <CardHeader className="border-b border-border bg-muted/20">
                      <CardTitle className="text-lg font-bold text-foreground">Recent Donations</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Real-time donation tracking via Pachangu webhooks
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Donor</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Anonymous</TableCell>
                            <TableCell className="text-muted-foreground">$500</TableCell>
                            <TableCell className="text-muted-foreground">Mobile Money</TableCell>
                            <TableCell className="text-muted-foreground">Lilongwe Solar</TableCell>
                            <TableCell className="text-muted-foreground">2 min ago</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Confirmed</Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">John Phiri</TableCell>
                            <TableCell className="text-muted-foreground">$100</TableCell>
                            <TableCell className="text-muted-foreground">Bank Transfer</TableCell>
                            <TableCell className="text-muted-foreground">General Fund</TableCell>
                            <TableCell className="text-muted-foreground">1 hour ago</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Confirmed</Badge>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Mary Banda</TableCell>
                            <TableCell className="text-muted-foreground">$250</TableCell>
                            <TableCell className="text-muted-foreground">Card Payment</TableCell>
                            <TableCell className="text-muted-foreground">Training Center</TableCell>
                            <TableCell className="text-muted-foreground">3 hours ago</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                Processing
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "finance" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Financial Management</h3>
                      <p className="text-muted-foreground">Track budgets, requests, and liquidations</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Button disabled={hasPendingLiquidations} className="disabled:opacity-50 font-medium shadow-md">
                        <Plus className="w-4 h-4 mr-2" />
                        New Request
                      </Button>
                      {hasPendingLiquidations && (
                        <p className="text-sm text-destructive max-w-xs text-right">
                          Complete pending liquidations before submitting new requests
                        </p>
                      )}
                    </div>
                  </div>

                  {hasPendingLiquidations && (
                    <Alert className="border-orange-300 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertTitle className="text-orange-800 font-semibold">Pending Liquidations</AlertTitle>
                      <AlertDescription className="text-orange-700">
                        You have {pendingLiquidationsCount} pending liquidation(s). Complete these before submitting new
                        financial requests.
                        <Button variant="link" className="p-0 h-auto text-orange-600 underline ml-2 font-medium">
                          View Liquidations
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Tabs defaultValue="requests" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/20 border-border">
                      <TabsTrigger value="requests" className="font-medium">
                        Requests
                      </TabsTrigger>
                      <TabsTrigger value="budgets" className="font-medium">
                        Budgets
                      </TabsTrigger>
                      <TabsTrigger value="liquidations" className="font-medium">
                        Liquidations
                        {pendingLiquidationsCount > 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs font-bold">
                            {pendingLiquidationsCount}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="reports" className="font-medium">
                        Reports
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" className="space-y-4 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-medium border-border hover:bg-muted/50 bg-transparent"
                          >
                            <Filter className="w-4 h-4 mr-2" />
                            Filter
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-medium border-border hover:bg-muted/50 bg-transparent"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Request ID</TableHead>
                            <TableHead>Requester</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Purpose</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Liquidation Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">FR-001</TableCell>
                            <TableCell className="text-muted-foreground">Dr. Grace Phiri</TableCell>
                            <TableCell className="text-muted-foreground">$2,500</TableCell>
                            <TableCell className="text-muted-foreground">Equipment Purchase</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                Approved
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive" className="font-bold">
                                Pending
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                                  <Clock className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">FR-002</TableCell>
                            <TableCell className="text-muted-foreground">James Mwale</TableCell>
                            <TableCell className="text-muted-foreground">$800</TableCell>
                            <TableCell className="text-muted-foreground">Travel Expenses</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                Approved
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="font-medium">
                                Completed
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="budgets" className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-card border-border shadow-md">
                          <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-bold text-foreground">Project Budgets</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-4">
                            <div>
                              <div className="flex justify-between text-sm mb-1 font-medium">
                                <span>Lilongwe Solar</span>
                                <span className="text-foreground">$45K / $60K</span>
                              </div>
                              <Progress value={75} className="h-2 bg-muted/50" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1 font-medium">
                                <span>Nsanje Rural</span>
                                <span className="text-foreground">$12K / $80K</span>
                              </div>
                              <Progress value={15} className="h-2 bg-muted/50" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-card border-border shadow-md">
                          <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-bold text-foreground">Operational Budget</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-4">
                            <div>
                              <div className="flex justify-between text-sm mb-1 font-medium">
                                <span>Staff Salaries</span>
                                <span className="text-foreground">$8K / $10K</span>
                              </div>
                              <Progress value={80} className="h-2 bg-muted/50" />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm mb-1 font-medium">
                                <span>Office Expenses</span>
                                <span className="text-foreground">$1.2K / $2K</span>
                              </div>
                              <Progress value={60} className="h-2 bg-muted/50" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="liquidations" className="space-y-4 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-medium border-border hover:bg-muted/50 bg-transparent"
                          >
                            <Filter className="w-4 h-4 mr-2" />
                            Filter by Status
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-medium border-border hover:bg-muted/50 bg-transparent"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Date Range
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          {pendingLiquidationsCount} pending liquidations
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Request ID</TableHead>
                            <TableHead>Person</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Receipts</TableHead>
                            <TableHead>Days Pending</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="bg-destructive/5">
                            <TableCell className="font-medium text-foreground">LQ-001</TableCell>
                            <TableCell className="text-muted-foreground">Dr. Grace Phiri</TableCell>
                            <TableCell className="text-muted-foreground">$2,500</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 mr-1 text-muted-foreground" />
                                <span className="text-muted-foreground">0/5 receipts</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive" className="font-bold">
                                15 days
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive" className="font-bold">
                                Overdue
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">LQ-002</TableCell>
                            <TableCell className="text-muted-foreground">Sarah Banda</TableCell>
                            <TableCell className="text-muted-foreground">$150</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 mr-1 text-muted-foreground" />
                                <span className="text-muted-foreground">3/3 receipts</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                3 days
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                Review
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="reports" className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Button
                          variant="outline"
                          className="h-20 flex-col bg-transparent border-border hover:bg-muted/50"
                        >
                          <FileText className="w-6 h-6 mb-2 text-primary" />
                          <span className="font-medium text-primary">Monthly Financial Report</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-20 flex-col bg-transparent border-border hover:bg-muted/50"
                        >
                          <PieChart className="w-6 h-6 mb-2 text-secondary" />
                          <span className="font-medium text-secondary">Budget vs Actual Analysis</span>
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {activeTab === "bookings" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Booking Management</h3>
                      <p className="text-muted-foreground">Manage venue and resource bookings</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      New Booking
                    </Button>
                  </div>

                  <Tabs defaultValue="venues" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-muted/20 border-border">
                      <TabsTrigger value="venues" className="font-medium">
                        Venues
                      </TabsTrigger>
                      <TabsTrigger value="resources" className="font-medium">
                        Resources
                      </TabsTrigger>
                      <TabsTrigger value="calendar" className="font-medium">
                        Calendar
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="venues" className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="border-b border-border">
                            <CardTitle className="text-lg font-bold text-foreground flex items-center">
                              <Building className="w-5 h-5 mr-2 text-primary" />
                              Conference Room A
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">Capacity: 50 people</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Today's Bookings</span>
                                <span className="font-medium text-foreground">3</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Next Available</span>
                                <span className="font-medium text-foreground">2:00 PM</span>
                              </div>
                              <Button size="sm" className="w-full font-medium shadow-md">
                                Book Now
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                          <CardHeader className="border-b border-border">
                            <CardTitle className="text-lg font-bold text-foreground flex items-center">
                              <Building className="w-5 h-5 mr-2 text-secondary" />
                              Training Hall
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">Capacity: 100 people</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Today's Bookings</span>
                                <span className="font-medium text-foreground">1</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Next Available</span>
                                <span className="font-medium text-foreground">Tomorrow</span>
                              </div>
                              <Button size="sm" className="w-full font-medium shadow-md">
                                Book Now
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="resources" className="space-y-4 pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Resource</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Current User</TableHead>
                            <TableHead>Return Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Projector #1</TableCell>
                            <TableCell className="text-muted-foreground">Equipment</TableCell>
                            <TableCell>
                              <Badge className="bg-destructive/10 text-destructive font-medium">In Use</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">Dr. Grace Phiri</TableCell>
                            <TableCell className="text-muted-foreground">Dec 12, 2024</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Sound System</TableCell>
                            <TableCell className="text-muted-foreground">Equipment</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Available</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell className="text-muted-foreground">-</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                <Plus className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="calendar" className="space-y-4 pt-4">
                      <div className="text-center py-20 bg-muted/10 rounded-lg border border-dashed border-border">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                        <h4 className="text-lg font-semibold text-muted-foreground">Booking Calendar</h4>
                        <p className="text-muted-foreground">Interactive calendar view would be displayed here</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {activeTab === "reports" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Reports & Analytics</h3>
                      <p className="text-muted-foreground">Generate comprehensive reports for management review</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Download className="w-4 h-4 mr-2" />
                      Export All
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-300 bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                          Donation Trends
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Monthly donation analysis with charts
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Button
                          variant="outline"
                          className="w-full font-medium bg-transparent border-border hover:bg-muted/50"
                        >
                          Generate Report
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-300 bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center">
                          <PieChart className="w-5 h-5 mr-2 text-secondary" />
                          Fund Allocation
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Project funding distribution analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Button
                          variant="outline"
                          className="w-full font-medium bg-transparent border-border hover:bg-muted/50"
                        >
                          Generate Report
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-300 bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center">
                          <Users className="w-5 h-5 mr-2 text-primary" />
                          Volunteer Contributions
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Staff and volunteer hour summaries
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Button
                          variant="outline"
                          className="w-full font-medium bg-transparent border-border hover:bg-muted/50"
                        >
                          Generate Report
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-300 bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center">
                          <DollarSign className="w-5 h-5 mr-2 text-secondary" />
                          Financial Summary
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Budget vs actual spending analysis
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Button
                          variant="outline"
                          className="w-full font-medium bg-transparent border-border hover:bg-muted/50"
                        >
                          Generate Report
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-300 bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2 text-destructive" />
                          Project Performance
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Project milestone and budget tracking
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Button
                          variant="outline"
                          className="w-full font-medium bg-transparent border-border hover:bg-muted/50"
                        >
                          Generate Report
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-xl transition-shadow duration-300 bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center">
                          <Calendar className="w-5 h-5 mr-2 text-indigo-500" />
                          Event Analytics
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Event attendance and revenue reports
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <Button
                          variant="outline"
                          className="w-full font-medium bg-transparent border-border hover:bg-muted/50"
                        >
                          Generate Report
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "admin" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Administration</h3>
                      <p className="text-muted-foreground">System settings, user management, and audit logs</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Shield className="w-4 h-4 mr-2" />
                      Security Settings
                    </Button>
                  </div>

                  <Tabs defaultValue="users" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-muted/20 border-border">
                      <TabsTrigger value="users" className="font-medium">
                        User Management
                      </TabsTrigger>
                      <TabsTrigger value="audit" className="font-medium">
                        Audit Logs
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="font-medium">
                        Settings
                      </TabsTrigger>
                      <TabsTrigger value="backup" className="font-medium">
                        Backup
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="users" className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-foreground">User Accounts</h4>
                        <Button className="font-medium shadow-md">
                          <Plus className="w-4 h-4 mr-2" />
                          Add User
                        </Button>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>2FA Status</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Dr. Grace Phiri</TableCell>
                            <TableCell className="text-muted-foreground">grace@angazafoundation.org</TableCell>
                            <TableCell>
                              <Badge className="bg-primary/10 text-primary font-medium">Admin</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Enabled</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">2 hours ago</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">James Mwale</TableCell>
                            <TableCell className="text-muted-foreground">james@angazafoundation.org</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                Finance
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                Disabled
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">1 day ago</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="audit" className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-foreground">System Audit Logs</h4>
                        <div className="flex space-x-2">
                          <Select defaultValue="all">
                            <SelectTrigger className="w-32 font-medium border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Actions</SelectItem>
                              <SelectItem value="login">Logins</SelectItem>
                              <SelectItem value="donation">Donations</SelectItem>
                              <SelectItem value="project">Projects</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            className="font-medium border-border hover:bg-muted/50 bg-transparent"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Resource</TableHead>
                            <TableHead>IP Address</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-muted-foreground">Dec 10, 2024 14:30</TableCell>
                            <TableCell className="font-medium text-foreground">Dr. Grace Phiri</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                Project Updated
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">Lilongwe Solar Grid</TableCell>
                            <TableCell className="text-muted-foreground">192.168.1.100</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-muted-foreground">Dec 10, 2024 14:15</TableCell>
                            <TableCell className="font-medium text-foreground">System</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Donation Received</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">Pachangu Webhook</TableCell>
                            <TableCell className="text-muted-foreground">Pachangu API</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-muted-foreground">Dec 10, 2024 13:45</TableCell>
                            <TableCell className="font-medium text-foreground">James Mwale</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-muted-foreground">
                                Login
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">Dashboard</TableCell>
                            <TableCell className="text-muted-foreground">192.168.1.105</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-card border-border shadow-md">
                          <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-bold text-foreground">Firebase Configuration</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              Manage Firebase project settings
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">Firestore Status</span>
                              <Badge className="bg-green-100 text-green-800 font-medium">Connected</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">Authentication</span>
                              <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">Cloud Functions</span>
                              <Badge className="bg-green-100 text-green-800 font-medium">Deployed</Badge>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-card border-border shadow-md">
                          <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-bold text-foreground">Pachangu Integration</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              Payment gateway configuration
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">API Status</span>
                              <Badge className="bg-green-100 text-green-800 font-medium">Connected</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">Webhook Status</span>
                              <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-medium border-border hover:bg-muted/50 bg-transparent"
                            >
                              Test Connection
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="backup" className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-card border-border shadow-md">
                          <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-bold text-foreground">Database Backup</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              Automated Firebase Firestore backups
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4 pt-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">Last Backup</span>
                              <span className="text-sm text-muted-foreground">2 hours ago</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-foreground">Backup Frequency</span>
                              <span className="text-sm text-muted-foreground">Daily</span>
                            </div>
                            <Button className="w-full font-medium shadow-md">
                              <Download className="w-4 h-4 mr-2" />
                              Create Backup Now
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="bg-card border-border shadow-md">
                          <CardHeader className="border-b border-border bg-muted/20">
                            <CardTitle className="text-lg font-bold text-foreground">Data Export</CardTitle>
                            <CardDescription className="text-muted-foreground">
                              Export data for external analysis
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-4">
                            <Button
                              variant="outline"
                              className="w-full justify-start font-medium bg-transparent border-border hover:bg-muted/50"
                            >
                              <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                              Export Donations (CSV)
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start font-medium bg-transparent border-border hover:bg-muted/50"
                            >
                              <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                              Export Projects (PDF)
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full justify-start font-medium bg-transparent border-border hover:bg-muted/50"
                            >
                              <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                              Export Personnel (CSV)
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {activeTab === "beneficiaries" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Beneficiary Management</h3>
                      <p className="text-muted-foreground">Track individuals and families served by the foundation</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Beneficiary
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Beneficiaries</p>
                            <p className="text-2xl font-bold text-foreground">2,847</p>
                          </div>
                          <UserCheck className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Active in Programs</p>
                            <p className="text-2xl font-bold text-foreground">1,923</p>
                          </div>
                          <Users className="w-8 h-8 text-secondary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Communities Reached</p>
                            <p className="text-2xl font-bold text-foreground">47</p>
                          </div>
                          <MapPin className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-card border-border shadow-md">
                    <CardHeader className="border-b border-border bg-muted/20">
                      <CardTitle className="text-lg font-bold text-foreground">Beneficiary Registry</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Manage beneficiary profiles and program enrollment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 pt-4">
                        <div className="flex gap-4">
                          <Input placeholder="Search beneficiaries..." className="flex-1" />
                          <Select>
                            <SelectTrigger className="w-48 font-medium border-border">
                              <SelectValue placeholder="Filter by program" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Programs</SelectItem>
                              <SelectItem value="energy">Energy Access</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="health">Healthcare</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Age</TableHead>
                              <TableHead>Gender</TableHead>
                              <TableHead>Community</TableHead>
                              <TableHead>Programs</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium text-foreground">Grace Mwanza</TableCell>
                              <TableCell className="text-muted-foreground">34</TableCell>
                              <TableCell className="text-muted-foreground">Female</TableCell>
                              <TableCell className="text-muted-foreground">Lilongwe District</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Badge variant="secondary" className="text-secondary font-medium">
                                    Energy Access
                                  </Badge>
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Education
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-foreground">James Banda</TableCell>
                              <TableCell className="text-muted-foreground">28</TableCell>
                              <TableCell className="text-muted-foreground">Male</TableCell>
                              <TableCell className="text-muted-foreground">Blantyre Rural</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-secondary font-medium">
                                  Healthcare
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "community-map" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Community Mapping</h3>
                      <p className="text-muted-foreground">Visualize geographic areas served in Malawi</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Download className="w-4 h-4 mr-2" />
                      Export Map
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Card className="lg:col-span-3 bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg font-bold text-foreground">Interactive Community Map</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Click on markers to view community details and program reach
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-96 bg-muted/10 rounded-lg border border-dashed border-border flex items-center justify-center">
                          <div className="text-center">
                            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">Interactive map of Malawi communities</p>
                            <p className="text-sm text-muted-foreground mt-2">
                              Showing 47 communities across 12 districts
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      <Card className="bg-card border-border shadow-md">
                        <CardHeader className="border-b border-border bg-muted/20">
                          <CardTitle className="text-lg font-bold text-foreground">Map Filters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                          <div>
                            <Label htmlFor="program-filter" className="font-medium text-foreground">
                              Program Type
                            </Label>
                            <Select>
                              <SelectTrigger className="font-medium border-border">
                                <SelectValue placeholder="All Programs" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Programs</SelectItem>
                                <SelectItem value="energy">Energy Access</SelectItem>
                                <SelectItem value="education">Education</SelectItem>
                                <SelectItem value="health">Healthcare</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="impact-filter" className="font-medium text-foreground">
                              Impact Level
                            </Label>
                            <Select>
                              <SelectTrigger className="font-medium border-border">
                                <SelectValue placeholder="All Levels" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="high">High Impact</SelectItem>
                                <SelectItem value="medium">Medium Impact</SelectItem>
                                <SelectItem value="low">Emerging</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="demographics-filter" className="font-medium text-foreground">
                              Demographics
                            </Label>
                            <Select>
                              <SelectTrigger className="font-medium border-border">
                                <SelectValue placeholder="All Demographics" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Demographics</SelectItem>
                                <SelectItem value="youth">Youth Focus</SelectItem>
                                <SelectItem value="women">Women Focus</SelectItem>
                                <SelectItem value="elderly">Elderly Focus</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-card border-border shadow-md">
                        <CardHeader className="border-b border-border bg-muted/20">
                          <CardTitle className="text-lg font-bold text-foreground">Quick Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Districts</span>
                            <span className="font-medium text-foreground">12</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Communities</span>
                            <span className="font-medium text-foreground">47</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Beneficiaries</span>
                            <span className="font-medium text-foreground">2,847</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Active Programs</span>
                            <span className="font-medium text-foreground">23</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "impact" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Impact Measurement</h3>
                      <p className="text-muted-foreground">Track before/after assessments and program outcomes</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      New Assessment
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Overall Impact Score</p>
                            <p className="text-2xl font-bold text-foreground">8.4/10</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Assessments Completed</p>
                            <p className="text-2xl font-bold text-foreground">1,247</p>
                          </div>
                          <FileText className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Improvement Rate</p>
                            <p className="text-2xl font-bold text-foreground">73%</p>
                          </div>
                          <ArrowUp className="w-8 h-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Programs Measured</p>
                            <p className="text-2xl font-bold text-foreground">23</p>
                          </div>
                          <BarChart3 className="w-8 h-8 text-secondary" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg font-bold text-foreground">Impact Metrics by Program</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Baseline vs. current outcomes
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">Energy Access Program</span>
                            <span className="text-sm text-muted-foreground font-medium">+45% improvement</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: "85%" }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">Education Initiative</span>
                            <span className="text-sm text-muted-foreground font-medium">+62% improvement</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: "78%" }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">Healthcare Access</span>
                            <span className="text-sm text-muted-foreground font-medium">+38% improvement</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: "69%" }}></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg font-bold text-foreground">Recent Assessments</CardTitle>
                        <CardDescription className="text-muted-foreground">Latest impact measurements</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                          <div>
                            <p className="font-medium text-foreground">Solar Installation Impact</p>
                            <p className="text-sm text-muted-foreground">Lilongwe District - 45 households</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 font-medium">Completed</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                          <div>
                            <p className="font-medium text-foreground">Education Program Follow-up</p>
                            <p className="text-sm text-muted-foreground">Blantyre Rural - 120 students</p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800 font-medium">In Progress</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                          <div>
                            <p className="font-medium text-foreground">Healthcare Access Survey</p>
                            <p className="text-sm text-muted-foreground">Mzuzu District - 78 families</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 font-medium">Scheduled</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === "programs" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Program Portfolio Management</h3>
                      <p className="text-muted-foreground">Track and manage multiple programs across communities</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      New Program
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Programs</p>
                            <p className="text-2xl font-bold text-foreground">23</p>
                          </div>
                          <Layers className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                            <p className="text-2xl font-bold text-foreground">$2.4M</p>
                          </div>
                          <DollarSign className="w-8 h-8 text-secondary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Staff Assigned</p>
                            <p className="text-2xl font-bold text-foreground">89</p>
                          </div>
                          <Users className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg. Success Rate</p>
                            <p className="text-2xl font-bold text-foreground">87%</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-card border-border shadow-md">
                    <CardHeader className="border-b border-border bg-muted/20">
                      <CardTitle className="text-lg font-bold text-foreground">Program Portfolio Overview</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Manage timelines, milestones, and KPIs for all programs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Program Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Timeline</TableHead>
                            <TableHead>Budget</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Staff</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">
                              Solar Energy Access Initiative
                            </TableCell>
                            <TableCell className="text-muted-foreground">Energy</TableCell>
                            <TableCell className="text-muted-foreground">Jan 2024 - Dec 2024</TableCell>
                            <TableCell className="text-muted-foreground">$450,000</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-muted/50 rounded-full h-2">
                                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                                </div>
                                <span className="text-sm text-foreground">75%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">12</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">On Track</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Community Education Program</TableCell>
                            <TableCell className="text-muted-foreground">Education</TableCell>
                            <TableCell className="text-muted-foreground">Mar 2024 - Nov 2024</TableCell>
                            <TableCell className="text-muted-foreground">$280,000</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-muted/50 rounded-full h-2">
                                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "45%" }}></div>
                                </div>
                                <span className="text-sm text-foreground">45%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">8</TableCell>
                            <TableCell>
                              <Badge className="bg-yellow-100 text-yellow-800 font-medium">At Risk</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium text-foreground">Healthcare Access Expansion</TableCell>
                            <TableCell className="text-muted-foreground">Healthcare</TableCell>
                            <TableCell className="text-muted-foreground">Feb 2024 - Oct 2024</TableCell>
                            <TableCell className="text-muted-foreground">$320,000</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-muted/50 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: "60%" }}></div>
                                </div>
                                <span className="text-sm text-foreground">60%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">15</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">On Track</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "resources" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Resource Distribution</h3>
                      <p className="text-muted-foreground">Manage distribution of supplies, equipment, and aid</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      New Distribution
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Distributions</p>
                            <p className="text-2xl font-bold text-foreground">1,247</p>
                          </div>
                          <Package className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Value Distributed</p>
                            <p className="text-2xl font-bold text-foreground">$890K</p>
                          </div>
                          <DollarSign className="w-8 h-8 text-secondary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Recipients</p>
                            <p className="text-2xl font-bold text-foreground">2,134</p>
                          </div>
                          <Users className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Pending Distributions</p>
                            <p className="text-2xl font-bold text-foreground">23</p>
                          </div>
                          <Clock className="w-8 h-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg font-bold text-foreground">Distribution by Category</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Resource allocation across different categories
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">Solar Equipment</span>
                            <span className="text-sm text-muted-foreground font-medium">$340K (38%)</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "38%" }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">Educational Materials</span>
                            <span className="text-sm text-muted-foreground font-medium">$267K (30%)</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: "30%" }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">Medical Supplies</span>
                            <span className="text-sm text-muted-foreground font-medium">$178K (20%)</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: "20%" }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">Food & Nutrition</span>
                            <span className="text-sm text-muted-foreground font-medium">$105K (12%)</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: "12%" }}></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg font-bold text-foreground">Recent Distributions</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Latest resource distribution events
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                          <div>
                            <p className="font-medium text-foreground">Solar Panel Distribution</p>
                            <p className="text-sm text-muted-foreground">Lilongwe District - 45 households</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 font-medium">Completed</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                          <div>
                            <p className="font-medium text-foreground">School Supply Distribution</p>
                            <p className="text-sm text-muted-foreground">Blantyre Rural - 120 students</p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800 font-medium">In Progress</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                          <div>
                            <p className="font-medium text-foreground">Medical Kit Distribution</p>
                            <p className="text-sm text-muted-foreground">Mzuzu District - 78 families</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 font-medium">Scheduled</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-card border-border shadow-md">
                    <CardHeader className="border-b border-border bg-muted/20">
                      <CardTitle className="text-lg font-bold text-foreground">Distribution Log</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Track all resource distributions and recipients
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Resource Type</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Recipients</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="text-muted-foreground">2024-09-15</TableCell>
                            <TableCell className="text-muted-foreground">Solar Panels</TableCell>
                            <TableCell className="text-muted-foreground">45 units</TableCell>
                            <TableCell className="text-muted-foreground">$22,500</TableCell>
                            <TableCell className="text-muted-foreground">Lilongwe District</TableCell>
                            <TableCell className="text-muted-foreground">45</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Completed</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="text-muted-foreground">2024-09-12</TableCell>
                            <TableCell className="text-muted-foreground">Educational Materials</TableCell>
                            <TableCell className="text-muted-foreground">120 sets</TableCell>
                            <TableCell className="text-muted-foreground">$8,400</TableCell>
                            <TableCell className="text-muted-foreground">Blantyre Rural</TableCell>
                            <TableCell className="text-muted-foreground">120</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 font-medium">Completed</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "partners" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Partner Organization Management</h3>
                      <p className="text-muted-foreground">Track relationships with partner organizations</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Partner
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Partners</p>
                            <p className="text-2xl font-bold text-foreground">47</p>
                          </div>
                          <Handshake className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Collaborations</p>
                            <p className="text-2xl font-bold text-foreground">23</p>
                          </div>
                          <Users className="w-8 h-8 text-secondary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Joint Projects</p>
                            <p className="text-2xl font-bold text-foreground">12</p>
                          </div>
                          <FolderOpen className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Follow-ups Due</p>
                            <p className="text-2xl font-bold text-foreground">8</p>
                          </div>
                          <Clock className="w-8 h-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-card border-border shadow-md">
                    <CardHeader className="border-b border-border bg-muted/20">
                      <CardTitle className="text-lg font-bold text-foreground">Partner Organizations</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Manage partner profiles and collaboration history
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 pt-4">
                        <div className="flex gap-4">
                          <Input placeholder="Search partners..." className="flex-1" />
                          <Select>
                            <SelectTrigger className="w-48 font-medium border-border">
                              <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="ngo">NGO</SelectItem>
                              <SelectItem value="government">Government</SelectItem>
                              <SelectItem value="international">International</SelectItem>
                              <SelectItem value="private">Private Sector</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Organization</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Contact Person</TableHead>
                              <TableHead>Active Projects</TableHead>
                              <TableHead>Last Contact</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium text-foreground">USAID Malawi</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-muted-foreground">
                                  International
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">Sarah Johnson</TableCell>
                              <TableCell className="text-muted-foreground">3</TableCell>
                              <TableCell className="text-muted-foreground">2024-09-10</TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-foreground">Ministry of Energy</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-muted-foreground">
                                  Government
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">Dr. Peter Mwanza</TableCell>
                              <TableCell className="text-muted-foreground">2</TableCell>
                              <TableCell className="text-muted-foreground">2024-09-05</TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-foreground">Solar Solutions Ltd</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-muted-foreground">
                                  Private Sector
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">James Banda</TableCell>
                              <TableCell className="text-muted-foreground">1</TableCell>
                              <TableCell className="text-muted-foreground">2024-08-28</TableCell>
                              <TableCell>
                                <Badge className="bg-yellow-100 text-yellow-800 font-medium">Follow-up Due</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "grants" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Grant & Funding Management</h3>
                      <p className="text-muted-foreground">Manage grants, funding sources, and compliance</p>
                    </div>
                    <Button className="font-medium shadow-md">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Grant
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Funding</p>
                            <p className="text-2xl font-bold text-foreground">$3.2M</p>
                          </div>
                          <Banknote className="w-8 h-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Grants</p>
                            <p className="text-2xl font-bold text-foreground">12</p>
                          </div>
                          <FileText className="w-8 h-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Utilization Rate</p>
                            <p className="text-2xl font-bold text-foreground">78%</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-secondary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Reports Due</p>
                            <p className="text-2xl font-bold text-foreground">5</p>
                          </div>
                          <Clock className="w-8 h-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg font-bold text-foreground">Grant Portfolio</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Overview of all grants and funding sources
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Grant Name</TableHead>
                              <TableHead>Funder</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium text-foreground">Energy Access Initiative</TableCell>
                              <TableCell className="text-muted-foreground">USAID</TableCell>
                              <TableCell className="text-muted-foreground">$850,000</TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-foreground">Community Education Program</TableCell>
                              <TableCell className="text-muted-foreground">World Bank</TableCell>
                              <TableCell className="text-muted-foreground">$650,000</TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-foreground">Healthcare Access Grant</TableCell>
                              <TableCell className="text-muted-foreground">Gates Foundation</TableCell>
                              <TableCell className="text-muted-foreground">$420,000</TableCell>
                              <TableCell>
                                <Badge className="bg-yellow-100 text-yellow-800 font-medium">Report Due</Badge>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md">
                      <CardHeader className="border-b border-border bg-muted/20">
                        <CardTitle className="text-lg font-bold text-foreground">Compliance Tracking</CardTitle>
                        <CardDescription className="text-muted-foreground">
                          Monitor compliance requirements and deadlines
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                          <div>
                            <p className="font-medium text-foreground">USAID Quarterly Report</p>
                            <p className="text-sm text-muted-foreground">Due: September 30, 2024</p>
                          </div>
                          <Badge className="bg-destructive/10 text-destructive font-medium">Overdue</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                          <div>
                            <p className="font-medium text-foreground">World Bank Impact Assessment</p>
                            <p className="text-sm text-muted-foreground">Due: October 15, 2024</p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800 font-medium">Due Soon</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10">
                          <div>
                            <p className="font-medium text-foreground">Gates Foundation Annual Report</p>
                            <p className="text-sm text-muted-foreground">Due: December 31, 2024</p>
                          </div>
                          <Badge className="bg-green-100 text-green-800 font-medium">On Track</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-card border-border shadow-md">
                    <CardHeader className="border-b border-border bg-muted/20">
                      <CardTitle className="text-lg font-bold text-foreground">Funding Utilization</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Track how grant funds are being utilized across programs
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 pt-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">USAID Energy Grant</span>
                            <span className="text-sm text-muted-foreground font-medium">$680K / $850K (80%)</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: "80%" }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">World Bank Education Grant</span>
                            <span className="text-sm text-muted-foreground font-medium">$455K / $650K (70%)</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: "70%" }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">Gates Healthcare Grant</span>
                            <span className="text-sm text-muted-foreground font-medium">$315K / $420K (75%)</span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { AngazaDashboard }
export default AngazaDashboard
