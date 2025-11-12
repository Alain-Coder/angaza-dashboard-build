'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { Package, Plus, DollarSign, Users, Clock, TrendingUp, Download, Package2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { ResourceDistributionForm } from "@/components/resource-distribution-form"
import { ResourceInventory } from "@/components/resource-inventory"
import { DistributionHistory } from "@/components/distribution-history"
import { LowStockAlert } from "@/components/low-stock-alert"
import { CategoryManagement } from "@/components/category-management"
import { useAuth } from '@/contexts/auth-context'
import { 
  getDistributionStats, 
  getCategoryStats, 
  getRecentDistributions, 
  getAllCategories,
  getDistributionsForExport
} from '@/lib/resource-utils'

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'categories'>('overview')
  const [distributionStats, setDistributionStats] = useState({
    totalDistributions: 0,
    valueDistributed: 0,
    recipients: 0,
    pendingDistributions: 0
  })
  
  const [categoryStats, setCategoryStats] = useState<any[]>([])
  const [recentDistributions, setRecentDistributions] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>(['all'])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Get user from auth context
  const { user } = useAuth()
  
  // Check if user has permission to perform actions
  const canPerformActions = () => {
    const allowedRoles = ['finance lead', 'programs lead', 'executive director']
    const userRole = user?.role?.toLowerCase() || ''
    return allowedRoles.includes(userRole)
  }

  // Load data on component mount and when refreshKey changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch all categories for filter dropdown
        const allCategories = await getAllCategories()
        setCategories(['all', ...allCategories])
        
        // Fetch stats with category filter
        const stats = await getDistributionStats(selectedCategory === 'all' ? undefined : selectedCategory)
        setDistributionStats(stats)
        
        const categories = await getCategoryStats(5, selectedCategory === 'all' ? undefined : selectedCategory)
        setCategoryStats(categories.map((cat, index) => {
          const colors = ['bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500']
          return {
            ...cat,
            color: colors[index % colors.length]
          }
        }))
        
        const recent = await getRecentDistributions(5, selectedCategory === 'all' ? undefined : selectedCategory)
        setRecentDistributions(recent)
      } catch (err) {
        console.error('Error loading data:', err)
        setError('Failed to load resource data. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [refreshKey, selectedCategory])

  // Refresh data when needed
  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Handle category filter change
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value)
  }

  // Export to CSV
  const handleExportToCSV = async () => {
    setExporting(true)
    try {
      const distributions = await getDistributionsForExport(selectedCategory === 'all' ? undefined : selectedCategory)
      
      // Create CSV content
      const headers = [
        'Resource Name',
        'Category',
        'Quantity',
        'Unit Value',
        'Total Value',
        'Recipient',
        'Location',
        'Date',
        'Status',
        'Created At'
      ]
      
      const csvContent = [
        headers.join(','),
        ...distributions.map(dist => [
          `"${dist.resourceName}"`,
          `"${dist.category}"`,
          dist.quantity,
          dist.unitValue,
          dist.totalValue,
          `"${dist.recipient}"`,
          `"${dist.location}"`,
          dist.date,
          dist.status,
          dist.createdAt instanceof Date ? dist.createdAt.toISOString().split('T')[0] : 
            typeof dist.createdAt === 'string' ? new Date(dist.createdAt).toISOString().split('T')[0] :
            dist.createdAt
        ].map(field => {
          // Escape double quotes by doubling them
          if (typeof field === 'string') {
            return `"${field.replace(/"/g, '""')}"`
          }
          return field
        }).join(','))
      ].join('\n')
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `distributions-${selectedCategory === 'all' ? 'all' : selectedCategory}-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting to CSV:', error)
      setError('Failed to export data. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <RoleBasedLayout>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </RoleBasedLayout>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <RoleBasedLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Resource Distribution</h1>
                <p className="text-muted-foreground">Manage distribution of supplies, equipment, and aid</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="font-medium shadow-md">
                    <Plus className="w-4 h-4 mr-2" />
                    New Distribution
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl p-0 max-h-[80vh] flex flex-col">
                  <DialogHeader className="p-6 pb-0 shrink-0">
                    <DialogTitle>New Resource Distribution</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto p-6 pt-0">
                    <ResourceDistributionForm 
                      onClose={() => {}} 
                      onDistributionCreated={refreshData} 
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="mt-2" 
                onClick={() => setRefreshKey(prev => prev + 1)}
              >
                Retry
              </Button>
            </div>
          </div>
        </RoleBasedLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <RoleBasedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Resource Distribution</h1>
              <p className="text-muted-foreground">Manage distribution of supplies, equipment, and aid</p>
            </div>
            {/* New Distribution button - only show in Inventory tab and for authorized users */}
            {activeTab === 'inventory' && canPerformActions() && (
              <div className="flex items-center space-x-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="font-medium shadow-md cursor-pointer" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      New Distribution
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl p-0 max-h-[80vh] flex flex-col">
                    <DialogHeader className="p-6 pb-0 shrink-0">
                      <DialogTitle>New Resource Distribution</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-6 pt-0">
                      <ResourceDistributionForm 
                        onClose={() => {}} 
                        onDistributionCreated={refreshData} 
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {/* Category Filter and Export - Only show in Overview tab */}
          {activeTab === 'overview' && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Filter by Category:</span>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-[200px] cursor-pointer">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleExportToCSV} 
                disabled={exporting}
                variant="outline"
                className="font-medium border-border hover:bg-muted/50 hover:text-foreground bg-transparent cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export to CSV'}
              </Button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b">
            <button
              className={`pb-2 px-1 font-medium cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`pb-2 px-1 font-medium cursor-pointer ${
                activeTab === 'inventory'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('inventory')}
            >
              Inventory
            </button>
            <button
              className={`pb-2 px-1 font-medium  cursor-pointer ${
                activeTab === 'categories'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('categories')}
            >
              Categories
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Low Stock Alert */}
              <LowStockAlert />

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Distributions</p>
                        <p className="text-2xl font-bold text-foreground">{distributionStats.totalDistributions.toLocaleString()}</p>
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
                        <p className="text-2xl font-bold text-foreground">K{(distributionStats.valueDistributed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-secondary" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantities Distributed</p>
                        <p className="text-2xl font-bold text-foreground">{distributionStats.recipients.toLocaleString()}</p>
                      </div>
                      <Package2 className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending Distributions</p>
                        <p className="text-2xl font-bold text-foreground">{distributionStats.pendingDistributions}</p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Resources by Category and Recent Distributions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border-border shadow-md">
                  <CardHeader className="border-b border-border bg-muted/20">
                    <CardTitle className="text-lg font-bold text-foreground">Resources by Category</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Resource usage across different categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {categoryStats.length > 0 ? (
                      categoryStats.slice(0, 6).map((category, index) => (
                        <div key={index}>
                          <div className="flex justify-between mb-2">
                            <div>
                              <span className="text-sm font-medium text-foreground">{category.category}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({category.used}/{category.quantity} used)
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground font-medium">
                              MWK{category.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({category.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div 
                              className={`${category.color} h-2 rounded-full`} 
                              style={{ width: `${category.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No category data available</p>
                    )}
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
                    {recentDistributions.length > 0 ? (
                      recentDistributions.slice(0, 6).map((distribution) => (
                        <div 
                          key={distribution.id} 
                          className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10"
                        >
                          <div>
                            <p className="font-medium text-foreground">{distribution.resourceName}</p>
                            <p className="text-sm text-muted-foreground">
                              {distribution.quantity} units • 
                              {distribution.totalValue ? ` MWK${distribution.totalValue.toFixed(2)}` : ' -'}
                            </p>
                          </div>
                          <Badge 
                            className={
                              distribution.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : distribution.status === 'in progress'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }
                          >
                            {distribution.status === 'in progress' 
                              ? 'In Progress' 
                              : distribution.status.charAt(0).toUpperCase() + distribution.status.slice(1)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No recent distributions</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeTab === 'inventory' && (
            <ResourceInventory key={`inventory-${refreshKey}`} canPerformActions={canPerformActions()} />
          )}

          {activeTab === 'categories' && (
            <CategoryManagement canPerformActions={canPerformActions()} />
          )}

          {/* Distribution History Section - Always visible when on inventory */}
          {(activeTab === 'inventory') && (
            <DistributionHistory key={`history-${refreshKey}`} canPerformActions={canPerformActions()} />
          )}
        </div>
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}