'use client'

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "next-themes"
import { BanknoteIcon, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  Calendar, 
  Settings,
  LogOut,
  Bell,
  Shield,
  Sun,
  Moon,
  FolderOpen,
  MapPin,
  TrendingUp,
  Package,
  Handshake,
  Banknote,
  Heart,
  FileText,
  Layers,
  UserCheck,
  Zap,
  PlayCircle,
  StopCircle,
  File as FileIcon,
  Coffee,
  Clock,
  Pause,
  Edit
} from "lucide-react"
import { LogoutButton } from "@/components/auth/logout-button"
import { ProfileMenu } from "@/components/profile-menu"
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp, orderBy, onSnapshot } from 'firebase/firestore'
import { toast } from 'sonner'
import { ProtectedNavigation } from '@/components/protected-navigation'
import { getAllowedTabs } from '@/lib/role-permissions'

interface RoleBasedLayoutProps {
  children: React.ReactNode
  roleName?: string
}

interface AttendanceRecord {
  id: string
  userId: string
  userName: string
  userRole: string
  checkInTime: Date | null
  checkOutTime: Date | null
  status: 'checked-in' | 'checked-out' | 'on-break' | 'lunch-break'
  currentStatus: 'working' | 'on-break' | 'lunch-break' | 'in-office' | 'holiday'
  breaks: {
    type: string
    startTime: Date
    endTime: Date | null
  }[]
  totalTime: number // in minutes
  overtime: number // in minutes
  programId?: string
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

// Add Program interface
interface Program {
  id: string
  name: string
  description: string
  projectId: string
  projectName: string
  budget: number
  startDate: Date
  endDate: Date
  progress: number
  staffCount: number
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'at-risk'
  createdAt: Date
  updatedAt: Date
  assignedUsers?: string[]
}

export function RoleBasedLayout({ children, roleName: propRoleName }: RoleBasedLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  
  // Clock in/out state
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState<Date | null>(null)
  const [selectedProject, setSelectedProject] = useState("")
  const [currentStatus, setCurrentStatus] = useState<'working' | 'on-break' | 'lunch-break' | 'in-office' | 'holiday'>('in-office')
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null)
  const [activeBreak, setActiveBreak] = useState<{type: string, startTime: Date} | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [programs, setPrograms] = useState<Program[]>([]) // Add programs state
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingPrograms, setLoadingPrograms] = useState(true) // Add loading state for programs
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Map Firebase role to display name
  const getRoleName = () => {
    if (!user?.role) return "User"
    
    const roleMap: Record<string, string> = {
      "system admin": "System Admin",
      "board": "Board Member",
      "executive director": "Executive Director",
      "finance lead": "Finance Lead",
      "programs lead": "Programs Lead",
      "project officer": "Project Officer",
      "office assistant": "Office Assistant",
    }
    
    return roleMap[user.role] || "User"
  }

  // Use either the prop values or dynamically fetched values
  const roleName = propRoleName || getRoleName()
  
  // Set initial active tab based on current path and user role
  const getInitialTab = () => {
    // For role-specific dashboard pages, always set overview as active tab
    if (pathname.includes('/executive-director') || 
        pathname.includes('/finance-lead') || 
        pathname.includes('/programs-lead') || 
        pathname.includes('/project-officer') || 
        pathname.includes('/office-assistant') || 
        pathname.includes('/board')) {
      return 'overview';
    }
    
    // For other paths, determine tab based on URL
    if (pathname.includes('/dashboard') || pathname === '/') return 'overview';
    if (pathname.includes('/projects')) return 'projects';
    if (pathname.includes('/staff')) return 'staff';
    if (pathname.includes('/donations')) return 'donations';
    if (pathname.includes('/finance')) return 'finance';
    if (pathname.includes('/beneficiaries')) return 'beneficiaries';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/impact')) return 'impact';
    if (pathname.includes('/programs')) return 'programs';
    if (pathname.includes('/resources')) return 'resources';
    if (pathname.includes('/partners')) return 'partners';
    if (pathname.includes('/grants')) return 'grants';
    if (pathname.includes('/files')) return 'files';
    return 'overview';
  }

  // Use useMemo with pathname as dependency to recalculate when path changes
  const initialTab = useMemo(() => getInitialTab(), [pathname])
  const [activeTab, setActiveTab] = useState(initialTab)

  // Update active tab when pathname changes, but only if it's actually different
  // For role-specific dashboard pages, always keep overview tab active
  useEffect(() => {
    const newTab = getInitialTab()
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [pathname, activeTab])

  // Check if user should have attendance tracking (exclude System Admin and Board, but include Executive Director)
  const shouldShowAttendance = () => {
    const excludedRoles = ["System Admin", "Board Member"]
    return !excludedRoles.includes(roleName)
  }

  // Fetch projects assigned to the user
  useEffect(() => {
    if (!user?.uid || !shouldShowAttendance()) return;

    const fetchUserProjects = async () => {
      try {
        setLoadingProjects(true);
        
        // Fetch projects
        const projectsQuery = query(
          collection(db, 'projects'),
          orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
          const allProjects = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              startDate: data.startDate?.toDate() || new Date(),
              endDate: data.endDate?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as Project;
          });
          
          setProjects(allProjects);
          setLoadingProjects(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching user projects:", error);
        setLoadingProjects(false);
      }
    };

    fetchUserProjects();
  }, [user?.uid]);
  
  // Fetch programs assigned to the user
  useEffect(() => {
    if (!user?.uid || !shouldShowAttendance()) return;

    const fetchUserPrograms = async () => {
      try {
        setLoadingPrograms(true);
        
        // Fetch programs
        const programsQuery = query(
          collection(db, 'programs'),
          orderBy('createdAt', 'desc')
        );
        
        const unsubscribe = onSnapshot(programsQuery, (snapshot) => {
          const allPrograms = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              startDate: data.startDate?.toDate() || new Date(),
              endDate: data.endDate?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              assignedUsers: data.assignedUsers || []
            } as Program;
          });
          
          setPrograms(allPrograms);
          setLoadingPrograms(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching user programs:", error);
        setLoadingPrograms(false);
      }
    };

    fetchUserPrograms();
  }, [user?.uid]);
  
  // Check if user is currently clocked in
  useEffect(() => {
    const checkAttendanceStatus = async () => {
      if (!user?.uid || !shouldShowAttendance()) return;
      
      try {
        const q = query(
          collection(db, 'attendance'),
          where('userId', '==', user.uid),
          where('checkOutTime', '==', null)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          setIsClockedIn(true);
          setClockInTime(data.checkInTime?.toDate() || new Date());
          
          // Check if user is currently on a break
          let activeBreakData = null;
          const breaks = data.breaks || [];
          if (breaks.length > 0) {
            // Find the most recent break without an end time
            const currentBreak = breaks.find((b: any) => !b.endTime);
            if (currentBreak) {
              activeBreakData = {
                type: currentBreak.type,
                startTime: currentBreak.startTime?.toDate ? currentBreak.startTime.toDate() : new Date(currentBreak.startTime)
              };
            }
          }
          
          const attendanceRecordData = {
            id: doc.id,
            userId: data.userId,
            userName: data.userName,
            userRole: data.userRole,
            checkInTime: data.checkInTime?.toDate() || new Date(),
            checkOutTime: null,
            status: data.status || 'checked-in',
            currentStatus: data.currentStatus || 'working',
            breaks: breaks,
            totalTime: data.totalTime || 0,
            overtime: data.overtime || 0,
            programId: data.programId || undefined
          };
          
          setAttendanceRecord(attendanceRecordData);
          setCurrentStatus(data.currentStatus || 'working');
          setSelectedProject(data.programId || "");
          setActiveBreak(activeBreakData);
        }
      } catch (error) {
        console.error("Error checking attendance status:", error);
      }
    };
    
    checkAttendanceStatus();
  }, [user?.uid]);

  // Debug effect to log activeBreak changes
  useEffect(() => {
    console.log("[UI Debug] activeBreak state changed:", activeBreak);
  }, [activeBreak]);

  // Define navigation items based on role
  const getNavigationItems = () => {
    // For Executive Director and Board, show all menus except Admin
    if (roleName === "Executive Director" || roleName === "Board Member") {
      return [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "projects", label: "Projects", icon: FolderOpen },
        { id: "staff", label: "Personnel", icon: Users },
        { id: "files", label: "Files", icon: FileIcon },
        { id: "donations", label: "Donations", icon: Heart },
        { id: "finance", label: "Finance", icon: BanknoteIcon },
        { id: "beneficiaries", label: "Beneficiaries", icon: UserCheck },
        { id: "partners", label: "Partners", icon: Handshake },
        { id: "programs", label: "Program Portfolio", icon: Layers },
        { id: "resources", label: "Resource Distribution", icon: Package },
        { id: "grants", label: "Grants & Funding", icon: Banknote },
      ]
    }
    
    // Finance Lead has access to all menus except Admin
    if (roleName === "Finance Lead") {
      return [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "projects", label: "Projects", icon: FolderOpen },
        { id: "staff", label: "Personnel", icon: Users },
        { id: "files", label: "Files", icon: FileIcon },
        { id: "donations", label: "Donations", icon: Heart },
        { id: "finance", label: "Finance", icon: BanknoteIcon },
        { id: "beneficiaries", label: "Beneficiaries", icon: UserCheck },
        { id: "partners", label: "Partners", icon: Handshake },
        { id: "programs", label: "Program Portfolio", icon: Layers },
        { id: "resources", label: "Resource Distribution", icon: Package },
        { id: "grants", label: "Grants & Funding", icon: Banknote }
      ]
    }
    
    // Programs Lead has access to specific menus
    if (roleName === "Programs Lead") {
      return [
        { id: "overview", label: "Overview", icon: Banknote },
        { id: "projects", label: "Projects", icon: FolderOpen },
        { id: "staff", label: "Personnel", icon: Users },
        { id: "files", label: "Files", icon: FileIcon },
        { id: "donations", label: "Donations", icon: Heart },
        { id: "finance", label: "Finance", icon: BanknoteIcon },
        { id: "beneficiaries", label: "Beneficiaries", icon: UserCheck },
        { id: "partners", label: "Partners", icon: Handshake },
        { id: "programs", label: "Program Portfolio", icon: Layers },
        { id: "resources", label: "Resource Distribution", icon: Package },
      ]
    }
    
    // Project Officer has access to all menus except Admin
    if (roleName === "Project Officer") {
      return [
        { id: "overview", label: "Overview", icon: Banknote },
        { id: "projects", label: "Projects", icon: FolderOpen },
        { id: "staff", label: "Personnel", icon: Users },
        { id: "files", label: "Files", icon: FileIcon },
        { id: "donations", label: "Donations", icon: Heart },
        { id: "beneficiaries", label: "Beneficiaries", icon: UserCheck },
        { id: "partners", label: "Partners", icon: Handshake },
        { id: "programs", label: "Program Portfolio", icon: Layers },
        { id: "resources", label: "Resource Distribution", icon: Package },
      ]
    }
    
    // Office Assistant has access to all menus except Admin
    if (roleName === "Office Assistant") {
      return [
        { id: "overview", label: "Overview", icon: Banknote },
        { id: "projects", label: "Projects", icon: FolderOpen },
        { id: "staff", label: "Personnel", icon: Users },
        { id: "files", label: "Files", icon: FileIcon },
        { id: "beneficiaries", label: "Beneficiaries", icon: UserCheck },
        { id: "programs", label: "Program Portfolio", icon: Layers },
        { id: "resources", label: "Resource Distribution", icon: Package },
        { id: "partners", label: "Partners", icon: Handshake },
      ]
    }
  
    // Default navigation for other roles
    return [
      { id: "overview", label: "Overview", icon: BarChart3 },
      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "staff", label: "Personnel", icon: Users },
      { id: "donations", label: "Donations", icon: Heart },
      { id: "finance", label: "Finance", icon: BanknoteIcon },
      { id: "beneficiaries", label: "Beneficiaries", icon: UserCheck },
      { id: "programs", label: "Program Portfolio", icon: Layers },
      { id: "resources", label: "Resource Distribution", icon: Package },
      { id: "partners", label: "Partners", icon: Handshake },
      { id: "grants", label: "Grants & Funding", icon: Banknote },
      { id: "reports", label: "Reports", icon: FileText },
      { id: "files", label: "Files", icon: FileIcon },
    ]
  }

  const navigationItems = getNavigationItems()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId)
    // Map tab IDs to actual routes
    const routeMap: Record<string, string> = {
      overview: roleName === "Executive Director" ? '/executive-director' : 
                roleName === "Finance Lead" ? '/finance-lead' : 
                roleName === "Programs Lead" ? '/programs-lead' : 
                roleName === "Project Officer" ? '/project-officer' : 
                roleName === "Office Assistant" ? '/office-assistant' : 
                roleName === "Board Member" ? '/board' : '/',
      projects: '/projects',
      staff: '/staff',
      donations: '/donations',
      finance: '/finance',
      beneficiaries: '/beneficiaries',
      impact: '/impact',
      programs: '/programs',
      resources: '/resources',
      partners: '/partners',
      grants: '/grants',
      reports: '/reports',
      files: '/files',
    }
    
    const route = routeMap[tabId]
    if (route) {
      router.push(route)
    }
  }

  const handleClockIn = async () => {
    if (!user?.uid) return;
    
    // Apply time restrictions for all users including Executive Director
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if current time is between 4:30 PM and 8:00 AM next day
    // 4:30 PM = 16:30, 8:00 AM = 8:00
    const isAfter430PM = currentHour > 16 || (currentHour === 16 && currentMinute >= 30);
    const isBefore8AM = currentHour < 8;
    
    if (isAfter430PM || isBefore8AM) {
      toast.error("Clock in is only allowed between 8:00 AM and 4:30 PM", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      });
      return;
    }
    
    try {
      const now = new Date();
      // Prepare attendance data
      const attendanceData: any = {
        userId: user.uid,
        userName: user.displayName || 'Unknown User',
        userRole: user.role || 'unknown',
        checkInTime: Timestamp.fromDate(now),
        checkOutTime: null,
        status: 'checked-in',
        currentStatus: 'working',
        breaks: [],
        totalTime: 0,
        overtime: 0,
        createdAt: Timestamp.now()
      };
      
      // Only add programId if it's not "General Work" and is a valid project
      if (selectedProject && selectedProject !== "general-work") {
        attendanceData.programId = selectedProject;
      }
      
      const docRef = await addDoc(collection(db, 'attendance'), attendanceData);
      
      // Prepare attendance record for state
      const attendanceRecordData: any = {
        id: docRef.id,
        userId: user.uid,
        userName: user.displayName || 'Unknown User',
        userRole: user.role || 'unknown',
        checkInTime: now,
        checkOutTime: null,
        status: 'checked-in',
        currentStatus: 'working',
        breaks: [],
        totalTime: 0,
        overtime: 0
      };
      
      // Only add programId if it's not "General Work" and is a valid project
      if (selectedProject && selectedProject !== "general-work") {
        attendanceRecordData.programId = selectedProject;
      }
      
      setIsClockedIn(true);
      setClockInTime(now);
      setAttendanceRecord(attendanceRecordData);
      
      toast.success("Successfully clocked in!", {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      });
      console.log("[v0] Clock in recorded to Firebase Firestore");
    } catch (error) {
      console.error("Error recording clock in:", error);
      toast.error("Failed to clock in. Please try again.", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      });
    }
  };

  const handleClockOut = async () => {
    if (!attendanceRecord) return;
    
    try {
      const now = new Date();
      const checkInTime = attendanceRecord.checkInTime;
      
      // Calculate total time worked (in minutes)
      let totalTime = 0;
      let overtime = 0;
      
      if (checkInTime) {
        totalTime = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60));
        
        // Calculate overtime (after 4:30 PM CAT)
        const endOfWorkDay = new Date(checkInTime);
        endOfWorkDay.setHours(16, 30, 0, 0); // 4:30 PM
        
        if (now > endOfWorkDay) {
          overtime = Math.floor((now.getTime() - endOfWorkDay.getTime()) / (1000 * 60));
        }
      }
      
      await updateDoc(doc(db, 'attendance', attendanceRecord.id), {
        checkOutTime: Timestamp.fromDate(now),
        status: 'checked-out',
        totalTime: totalTime,
        overtime: overtime,
        updatedAt: Timestamp.now()
      });
      
      setIsClockedIn(false);
      setClockInTime(null);
      setAttendanceRecord(null);
      setSelectedProject("");
      setCurrentStatus('in-office');
      setActiveBreak(null);
      
      toast.success("Successfully clocked out!", {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      });
      console.log("[v0] Clock out recorded to Firebase Firestore");
    } catch (error) {
      console.error("Error recording clock out:", error);
      toast.error("Failed to clock out. Please try again.", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      });
    }
  };

  const startBreak = async (breakType: string) => {
    if (!attendanceRecord) return;
    
    try {
      const now = new Date();
      
      // Map break types to status values (only actual break types)
      let statusValue: 'on-break' | 'lunch-break' = 'on-break';
      if (breakType === 'lunch-break') {
        statusValue = 'lunch-break';
      }
      
      const updatedBreaks = [...attendanceRecord.breaks, {
        type: breakType,
        startTime: now,
        endTime: null
      }];
      
      await updateDoc(doc(db, 'attendance', attendanceRecord.id), {
        breaks: updatedBreaks,
        currentStatus: statusValue,
        [`active${breakType.charAt(0).toUpperCase() + breakType.slice(1)}Break`]: Timestamp.fromDate(now),
        updatedAt: Timestamp.now()
      });
      
      setAttendanceRecord({
        ...attendanceRecord,
        breaks: updatedBreaks,
        currentStatus: statusValue
      });
      
      setCurrentStatus(statusValue);
      setActiveBreak({ type: breakType, startTime: now });
      
      // Show appropriate toast message based on break type
      const breakText = breakType === 'lunch-break' ? 'Lunch Break' : 'Regular Break';
      toast.success(`Started ${breakText}`, {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      });
    } catch (error) {
      console.error(`Error starting ${breakType} break:`, error);
      toast.error(`Failed to start ${breakType} break. Please try again.`, {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      });
    }
  };

  const endBreak = async () => {
    if (!attendanceRecord || !activeBreak) return;
    
    try {
      const now = new Date();
      const updatedBreaks = attendanceRecord.breaks.map(breakItem => 
        breakItem.endTime === null 
          ? { ...breakItem, endTime: now } 
          : breakItem
      );
      
      const updateData: any = {
        breaks: updatedBreaks,
        currentStatus: 'working',
        updatedAt: Timestamp.now()
      };
      
      updateData[`active${activeBreak.type.charAt(0).toUpperCase() + activeBreak.type.slice(1)}Break`] = null;
      
      await updateDoc(doc(db, 'attendance', attendanceRecord.id), updateData);
      
      setAttendanceRecord({
        ...attendanceRecord,
        breaks: updatedBreaks,
        currentStatus: 'working'
      });
      
      setCurrentStatus('working');
      setActiveBreak(null);
      
      // Show appropriate toast message based on break type
      const breakText = activeBreak.type === 'lunch-break' ? 'Lunch Break' : 'Regular Break';
      toast.success(`${breakText} ended!`, {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      });
    } catch (error) {
      console.error("Error ending break:", error);
      toast.error("Failed to end break. Please try again.", {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      });
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
        return 'bg-green-500';
      case 'on-break':
        return 'bg-yellow-500';
      case 'lunch-break':
        return 'bg-orange-500';
      case 'in-office':
        return 'bg-blue-500';
      case 'holiday':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'working':
        return 'Working';
      case 'on-break':
        return 'On Break';
      case 'lunch-break':
        return 'Lunch Break';
      case 'in-office':
        return 'In Office';
      case 'holiday':
        return 'Holiday';
      case 'break':
        return 'Regular Break';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button - only visible on small screens */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-sidebar text-sidebar-foreground border-sidebar-border shadow-lg"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex h-screen">
        {/* Desktop Sidebar - always visible on the left */}
        <div className="hidden md:block w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-lg flex flex-col">
          <div className="p-6 border-b border-sidebar-border/20 bg-sidebar">
            <div className="flex items-center justify-center mb-4">
              <Image 
                src="/logo.png" 
                alt="Angaza Foundation Logo" 
                width={150} 
                height={150} 
                className="object-cover"
              />
            </div>
            <div className="flex items-center space-x-3">
              <div>
                <Badge variant="secondary" className="mt-1 bg-sidebar-badge text-sidebar-badge-text border-0">
                  {roleName}
                </Badge>
              </div>
            </div>
          </div>

          <ProtectedNavigation>
            {(allowedTabs) => (
              <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-scrollbar scrollbar-track-transparent">
                <div className="space-y-1">
                  {getNavigationItems()
                    .filter(item => allowedTabs.includes(item.id))
                    .map((item) => {
                      const Icon = item.icon
                      return (
                        <Button
                          key={item.id}
                          variant={activeTab === item.id ? "default" : "ghost"}
                          className={`w-full justify-start h-11 px-4 font-medium transition-all duration-200 ${
                            activeTab === item.id
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md hover:bg-sidebar-primary/90 cursor-pointer"
                              : "hover:bg-sidebar-accent/10 text-sidebar-foreground/80 hover:text-sidebar-foreground cursor-pointer"
                          }`}
                          onClick={() => handleNavigation(item.id)}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {item.label}
                        </Button>
                      )
                    })}
                </div>
              </div>
            )}
          </ProtectedNavigation>

          {/* Clock In/Out Section */}
          {shouldShowAttendance() && (
            <div className="p-4 border-t border-sidebar-border/20 bg-sidebar">
              <div className="space-y-3">
                {!isClockedIn ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full shadow-sm font-medium border-sidebar-button hover:bg-sidebar-button-hover text-sidebar-foreground bg-sidebar/20 cursor-pointer"
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
                          {loadingProjects ? (
                            <div className="text-sm text-muted-foreground">Loading projects...</div>
                          ) : (
                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                              <SelectTrigger className="cursor-pointer">
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general-work" className="cursor-pointer">General Work</SelectItem>
                                {projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id} className="cursor-pointer">
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Button 
                          onClick={handleClockIn} 
                          className="w-full cursor-pointer"
                          disabled={loadingProjects}
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Start Working
                        </Button>
                        {!selectedProject && !loadingProjects && (
                          <p className="text-sm text-muted-foreground text-center">
                            Please select a project to continue
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleClockOut}
                        className="w-full shadow-sm font-medium cursor-pointer"
                      >
                        <StopCircle className="w-4 h-4 mr-2" />
                        Clock Out
                      </Button>
                      
                      {/* Status indicator */}
                      <div className="flex items-center justify-between p-2 bg-sidebar-primary/10 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(currentStatus)}`}></div>
                          <span className="text-xs font-medium">
                            {activeBreak 
                              ? (activeBreak.type === 'lunch-break' ? 'Lunch Break' : 'Regular Break') 
                              : getStatusText(currentStatus)}
                          </span>
                        </div>
                        <span className="text-xs text-sidebar-primary/80">
                          {formatTime(clockInTime)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Break controls */}
                    <div className="space-y-2">
                      {!activeBreak ? (
                        <div className="space-y-2">
                          <Label htmlFor="breakType">Start Break</Label>
                          <Select onValueChange={(value) => startBreak(value)}>
                            <SelectTrigger className="w-full border-sidebar-button bg-sidebar/20 text-sidebar-foreground hover:bg-sidebar-button-hover cursor-pointer">
                              <SelectValue placeholder="Select break type" className="text-sidebar-foreground" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="break">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                                  <span>Regular Break</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="lunch-break">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                                  <span>Lunch Break</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={endBreak}
                          className="w-full text-xs h-8 border-sidebar-button hover:bg-sidebar-button-hover text-sidebar-foreground bg-sidebar/20 cursor-pointer"
                        >
                          <PlayCircle className="w-3 h-3 mr-1" />
                          In Office
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-background">
          <header className="border-b border-border bg-card shadow-sm p-6 relative z-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground capitalize tracking-tight">
                  {activeTab.replace('-', ' ')}
                </h2>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  {roleName} dashboard
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleTheme}
                  className="hover:bg-primary/5 cursor-pointer"
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </Button>
                <div className="relative z-[9999]">
                  <ProfileMenu />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6 bg-muted/10">
            <div className="container mx-auto max-w-7xl">
              {children}
            </div>
          </div>
        </div>

        {/* Mobile Sidebar - slides in from the right on small screens only */}
        <div 
          className={`fixed md:hidden z-40 transform transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
            w-64 bg-sidebar/90 backdrop-blur-sm text-sidebar-foreground border-l border-sidebar-border/30 shadow-lg flex flex-col
            h-screen right-0`}
        >
          <div className="p-6 border-b border-sidebar-border/20 bg-sidebar/80 backdrop-blur-sm">
            <div className="flex items-center justify-center mb-4">
              <Image 
                src="/logo.png" 
                alt="Angaza Foundation Logo" 
                width={150} 
                height={150} 
                className="object-cover"
              />
            </div>
            <div className="flex items-center space-x-3">
              <div>
                <Badge variant="secondary" className="mt-1 bg-sidebar-badge/80 text-sidebar-badge-text border-0 backdrop-blur-sm">
                  {roleName}
                </Badge>
              </div>
            </div>
          </div>

          <ProtectedNavigation>
            {(allowedTabs) => (
              <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-scrollbar scrollbar-track-transparent bg-sidebar/80 backdrop-blur-sm">
                <div className="space-y-1">
                  {getNavigationItems()
                    .filter(item => allowedTabs.includes(item.id))
                    .map((item) => {
                      const Icon = item.icon
                      return (
                        <Button
                          key={item.id}
                          variant={activeTab === item.id ? "default" : "ghost"}
                          className={`w-full justify-start h-11 px-4 font-medium transition-all duration-200 ${
                            activeTab === item.id
                              ? "bg-sidebar-primary/90 text-sidebar-primary-foreground shadow-md hover:bg-sidebar-primary/80 cursor-pointer backdrop-blur-sm"
                              : "hover:bg-sidebar-accent/10 text-sidebar-foreground/80 hover:text-sidebar-foreground cursor-pointer bg-sidebar/50 backdrop-blur-sm"
                          }`}
                          onClick={() => {
                            handleNavigation(item.id)
                            // Close mobile menu when navigating
                            setIsMobileMenuOpen(false)
                          }}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {item.label}
                        </Button>
                      )
                    })}
                </div>
              </div>
            )}
          </ProtectedNavigation>

          {/* Clock In/Out Section */}
          {shouldShowAttendance() && (
            <div className="p-4 border-t border-sidebar-border/20 bg-sidebar/80 backdrop-blur-sm">
              <div className="space-y-3">
                {!isClockedIn ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full shadow-sm font-medium border-sidebar-button hover:bg-sidebar-button-hover text-sidebar-foreground bg-sidebar/20 cursor-pointer"
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
                          {loadingProjects ? (
                            <div className="text-sm text-muted-foreground">Loading projects...</div>
                          ) : (
                            <Select value={selectedProject} onValueChange={setSelectedProject}>
                              <SelectTrigger className="cursor-pointer">
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general-work" className="cursor-pointer">General Work</SelectItem>
                                {projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id} className="cursor-pointer">
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Button 
                          onClick={handleClockIn} 
                          className="w-full cursor-pointer"
                          disabled={loadingProjects}
                        >
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Start Working
                        </Button>
                        {!selectedProject && !loadingProjects && (
                          <p className="text-sm text-muted-foreground text-center">
                            Please select a project to continue
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleClockOut}
                        className="w-full shadow-sm font-medium cursor-pointer"
                      >
                        <StopCircle className="w-4 h-4 mr-2" />
                        Clock Out
                      </Button>
                      
                      {/* Status indicator */}
                      <div className="flex items-center justify-between p-2 bg-sidebar-primary/10 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(currentStatus)}`}></div>
                          <span className="text-xs font-medium">
                            {activeBreak 
                              ? (activeBreak.type === 'lunch-break' ? 'Lunch Break' : 'Regular Break') 
                              : getStatusText(currentStatus)}
                          </span>
                        </div>
                        <span className="text-xs text-sidebar-primary/80">
                          {formatTime(clockInTime)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Break controls */}
                    <div className="space-y-2">
                      {!activeBreak ? (
                        <div className="space-y-2">
                          <Label htmlFor="breakType">Start Break</Label>
                          <Select onValueChange={(value) => startBreak(value)}>
                            <SelectTrigger className="w-full border-sidebar-button bg-sidebar/20 text-sidebar-foreground hover:bg-sidebar-button-hover cursor-pointer">
                              <SelectValue placeholder="Select break type" className="text-sidebar-foreground" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="break">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                                  <span>Regular Break</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="lunch-break">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                                  <span>Lunch Break</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={endBreak}
                          className="w-full text-xs h-8 border-sidebar-button hover:bg-sidebar-button-hover text-sidebar-foreground bg-sidebar/20 cursor-pointer"
                        >
                          <PlayCircle className="w-3 h-3 mr-1" />
                          In Office
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Overlay for mobile menu */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}
      </div>
    </div>
  )
}
