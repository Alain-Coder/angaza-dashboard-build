'use client'

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Settings,
  LogOut,
  Bell,
  Sun,
  Moon,
  Zap
} from "lucide-react"
import { LogoutButton } from "@/components/auth/logout-button"
import { ProfileMenu } from "@/components/profile-menu"
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/contexts/auth-context'

interface RoleBasedLayoutSystemAdminProps {
  children: React.ReactNode
  roleName?: string
}

export function RoleBasedLayoutSystemAdmin({ children, roleName: propRoleName}: RoleBasedLayoutSystemAdminProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  
  // Map Firebase role to display name
  const getRoleName = () => {
    if (!user?.role) return "User"
    
    const roleMap: Record<string, string> = {
      "system admin": "System Administrator",
      "board": "Board Member",
      "executive director": "Executive Director",
      "finance lead": "Finance Lead",
      "programs lead": "Programs Lead",
      "project officer": "Project Officer",
      "office assistant": "Office Assistant",
      "admin officer": "Admin Officer",
      "community outreach officer": "Community Outreach Officer",
      "monitoring and evaluation lead": "Monitoring & Evaluation Lead"
    }
    
    return roleMap[user.role] || "User"
  }

  // Use either the prop values or dynamically fetched values
  const roleName = propRoleName || getRoleName()
  
  // Set initial active tab based on current path
  const getInitialTab = () => {
    if (pathname.includes('/system-admin')) return 'admin'
    return 'admin'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  // Update active tab when pathname changes
  useEffect(() => {
    setActiveTab(getInitialTab())
  }, [pathname])

  // System admin only has access to the admin section
  const navigationItems = [
    { id: "admin", label: "Admin", icon: Settings },
  ]

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId)
    // Map tab IDs to actual routes
    const routeMap: Record<string, string> = {
      admin: '/system-admin',
    }
    
    const route = routeMap[tabId]
    if (route) {
      router.push(route)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-lg flex flex-col">
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
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md hover:bg-sidebar-primary/90 cursor-pointer"
                        : "hover:bg-sidebar-accent/10 text-sidebar-foreground/80 hover:text-sidebar-foreground cursor-pointer"
                    }`}
                    onClick={() => handleNavigation(item.id)}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="p-4 border-t border-sidebar-border/20 bg-sidebar">
            {/* Removed LogoutButton as it's now handled in ProfileMenu */}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-background">
          <header className="border-b border-border bg-card shadow-sm p-6 relative z-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground capitalize tracking-tight">
                  {activeTab === "admin" ? "Administration" : activeTab.replace('-', ' ')}
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
      </div>
    </div>
  )
}