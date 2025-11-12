'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { Heart, Download, CreditCard, Edit, Search, Filter, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

// Define types for our donation data
interface Donation {
  id: string
  donor: string
  amount: number
  method: string
  project: string
  date: string
  status: string
  notes?: string
  recurring?: boolean
  createdAt?: Date
  createdBy?: string
}

interface Project {
  id: string
  name: string
}

export default function DonationsPage() {
  const { user } = useAuth()
  
  // State for donations data
  const [donations, setDonations] = useState<Donation[]>([])
  const [filteredDonations, setFilteredDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for projects
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  
  // State for manual entry dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentDonation, setCurrentDonation] = useState<Donation | null>(null)
  
  // State for view dialog
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingDonation, setViewingDonation] = useState<Donation | null>(null)
  
  // State for form data
  const [formData, setFormData] = useState({
    donor: '',
    amount: '',
    method: '',
    project: '',
    date: '',
    status: 'Confirmed',
    notes: '',
    recurring: false
  })
  
  // State for form errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [donationToDelete, setDonationToDelete] = useState<Donation | null>(null)

  // Unique values for filters
  const methods = Array.from(new Set(donations.map((d: Donation) => d.method)))
  const statuses = Array.from(new Set(donations.map((d: Donation) => d.status)))
  const projectNames = Array.from(new Set(donations.map((d: Donation) => d.project)))

  // Fetch projects from Firestore
  const fetchProjects = async () => {
    try {
      setProjectsLoading(true)
      const projectsQuery = query(collection(db, 'projects'), orderBy('name'))
      const projectsSnapshot = await getDocs(projectsQuery)
      
      const projectsData: Project[] = []
      projectsSnapshot.forEach((doc) => {
        projectsData.push({
          id: doc.id,
          name: doc.data().name || ''
        })
      })
      
      setProjects(projectsData)
    } catch (error: any) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setProjectsLoading(false)
    }
  }

  // Fetch donations from API
  const fetchDonations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/donations')
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setDonations(data.donations)
      setFilteredDonations(data.donations)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching donations:', err)
      setError('Failed to load donations')
      toast.error('Failed to load donations', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setLoading(false)
    }
  }

  // Apply filters and search
  useEffect(() => {
    let result = [...donations]
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(donation => 
        donation.donor.toLowerCase().includes(term) ||
        donation.project.toLowerCase().includes(term) ||
        donation.method.toLowerCase().includes(term)
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(donation => donation.status === statusFilter)
    }
    
    // Apply method filter
    if (methodFilter !== 'all') {
      result = result.filter(donation => donation.method === methodFilter)
    }
    
    // Apply project filter
    if (projectFilter !== 'all') {
      result = result.filter(donation => donation.project === projectFilter)
    }
    
    setFilteredDonations(result)
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchTerm, statusFilter, methodFilter, projectFilter, donations])

  // Fetch donations and projects on component mount
  useEffect(() => {
    fetchDonations()
    fetchProjects()
  }, [])

  // Pagination calculations
  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentDonations = filteredDonations.slice(startIndex, endIndex)

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle export to CSV
  const handleExportCSV = () => {
    try {
      // Create CSV content
      const headers = ['Donor', 'Amount', 'Method', 'Project', 'Date', 'Status', 'Notes', 'Recurring']
      const csvContent = [
        headers.join(','),
        ...filteredDonations.map(donation => [
          `"${donation.donor}"`,
          donation.amount,
          `"${donation.method}"`,
          `"${donation.project}"`,
          new Date(donation.date).toLocaleDateString(),
          `"${donation.status}"`,
          `"${donation.notes || ''}"`,
          donation.recurring ? 'Yes' : 'No'
        ].join(','))
      ].join('\n')
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `donations-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Donations exported successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error: any) {
      console.error('Error exporting CSV:', error)
      toast.error('Failed to export donations', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  // Handle manual entry
  const handleManualEntry = () => {
    setIsEditing(false)
    setCurrentDonation(null)
    setFormData({
      donor: '',
      amount: '',
      method: '',
      project: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Confirmed',
      notes: '',
      recurring: false
    })
    setErrors({})
    setIsDialogOpen(true)
  }

  // Handle edit donation
  const handleEditDonation = (donation: Donation) => {
    setIsEditing(true)
    setCurrentDonation(donation)
    setFormData({
      donor: donation.donor,
      amount: donation.amount.toString(),
      method: donation.method,
      project: donation.project,
      date: donation.date.split('T')[0],
      status: donation.status,
      notes: donation.notes || '',
      recurring: donation.recurring || false
    })
    setErrors({})
    setIsDialogOpen(true)
  }

  // Handle view donation
  const handleViewDonation = (donation: Donation) => {
    setViewingDonation(donation)
    setIsViewDialogOpen(true)
  }

  // Handle delete donation
  const handleDeleteDonation = (donation: Donation) => {
    setDonationToDelete(donation)
    setIsDeleteDialogOpen(true)
  }

  // Confirm delete donation
  const confirmDeleteDonation = async () => {
    if (!donationToDelete) return
    
    try {
      const response = await fetch(`/api/donations?id=${donationToDelete.id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Remove donation from state
      setDonations((prev: Donation[]) => prev.filter((d: Donation) => d.id !== donationToDelete.id))
      toast.success('Donation deleted successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
    } catch (error: any) {
      console.error('Error deleting donation:', error)
      toast.error('Failed to delete donation', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setDonationToDelete(null)
    }
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user makes a selection
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.donor.trim()) {
      newErrors.donor = 'Donor name is required'
    }
    
    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required'
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number'
    }
    
    if (!formData.method) {
      newErrors.method = 'Payment method is required'
    }
    
    if (!formData.project) {
      newErrors.project = 'Project is required'
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    try {
      const donationData = {
        donor: formData.donor,
        amount: parseFloat(formData.amount),
        method: formData.method,
        project: formData.project,
        date: new Date(formData.date).toISOString(),
        status: formData.status,
        notes: formData.notes,
        recurring: formData.recurring,
        createdBy: user?.displayName || user?.email || 'Unknown User',
        createdAt: new Date()
      }
      
      if (isEditing && currentDonation) {
        // Update existing donation
        const response = await fetch(`/api/donations?id=${currentDonation.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(donationData),
        })
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        // Update donation in state
        setDonations((prev: Donation[]) => 
          prev.map((d: Donation) => d.id === currentDonation.id ? { ...d, ...donationData } : d)
        )
        toast.success('Donation updated successfully', {
          style: { backgroundColor: '#dcfce7', color: '#166534' }
        })
      } else {
        // Add new donation
        const response = await fetch('/api/donations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(donationData),
        })
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        // Add new donation to state
        setDonations((prev: Donation[]) => [{ ...data, id: data.id }, ...prev])
        toast.success('Donation added successfully', {
          style: { backgroundColor: '#dcfce7', color: '#166534' }
        })
      }
      
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error('Error saving donation:', error)
      toast.error(`Failed to save donation: ${error.message || error}`, {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setMethodFilter('all')
    setProjectFilter('all')
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'default'
      case 'processing':
        return 'secondary'
      case 'pending':
        return 'outline'
      case 'failed':
        return 'destructive'
      default:
        return 'default'
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MWK',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format datetime for detailed view
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate today's donations total
  const getTodaysDonationsTotal = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todaysDonations = donations.filter(donation => {
      const donationDate = new Date(donation.date)
      donationDate.setHours(0, 0, 0, 0)
      return donationDate.getTime() === today.getTime()
    })
    
    return todaysDonations.reduce((sum, donation) => sum + donation.amount, 0)
  }

  // Calculate this month's donations total
  const getThisMonthDonationsTotal = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    
    const thisMonthDonations = donations.filter(donation => {
      const donationDate = new Date(donation.date)
      return (
        donationDate.getFullYear() === currentYear &&
        donationDate.getMonth() === currentMonth
      )
    })
    
    return thisMonthDonations.reduce((sum, donation) => sum + donation.amount, 0)
  }

  // Get count of todays donations
  const getTodaysDonationsCount = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return donations.filter(donation => {
      const donationDate = new Date(donation.date)
      donationDate.setHours(0, 0, 0, 0)
      return donationDate.getTime() === today.getTime()
    }).length
  }

  // Get count of this month's donations
  const getThisMonthDonationsCount = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    
    return donations.filter(donation => {
      const donationDate = new Date(donation.date)
      return (
        donationDate.getFullYear() === currentYear &&
        donationDate.getMonth() === currentMonth
      )
    }).length
  }

  // Get count of recurring donors
  const getRecurringDonorsCount = () => {
    return donations.filter(donation => donation.recurring).length
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
                <h1 className="text-2xl font-bold text-foreground">Donation Management</h1>
                <p className="text-muted-foreground">Manage and track Donations</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="font-medium border-border hover:bg-muted/50 hover:text-foreground bg-transparent cursor-pointer"
                  onClick={handleExportCSV}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  className="font-medium shadow-md cursor-pointer"
                  onClick={handleManualEntry}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manual Entry
                </Button>
              </div>
            </div>
            
            <Card className="bg-card border-border shadow-md">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-foreground">Error Loading Donations</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {error}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className='cursor-pointer' onClick={fetchDonations}>Retry</Button>
              </CardContent>
            </Card>
          </div>
        </RoleBasedLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <RoleBasedLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Donation Management</h1>
              <p className="text-muted-foreground">Manage and track Donations</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                className="font-medium border-border hover:bg-muted/50 bg-transparent cursor-pointer"
                onClick={handleExportCSV}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                className="font-medium shadow-md cursor-pointer"
                onClick={handleManualEntry}
              >
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
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(getTodaysDonationsTotal())}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {getTodaysDonationsCount()} donations
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm font-semibold text-primary">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(getThisMonthDonationsTotal())}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {getThisMonthDonationsCount()} donations
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm font-semibold text-primary">Recurring Donors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {getRecurringDonorsCount()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Monthly subscribers</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border shadow-md">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-lg font-bold text-foreground">Recent Donations</CardTitle>
              <CardDescription className="text-muted-foreground">
                Real-time donation tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-muted/10 rounded-lg">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search donors, projects, methods..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className='cursor-pointer'>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      {methods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full cursor-pointer">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      {projectNames.map(project => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    onClick={resetFilters}
                    className="w-full cursor-pointer"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* Donations Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentDonations.length > 0 ? (
                    currentDonations.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell className="font-medium text-foreground">
                          {donation.donor}
                          {donation.recurring && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                              Recurring
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(donation.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{donation.method}</TableCell>
                        <TableCell className="text-muted-foreground">{donation.project}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(donation.date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(donation.status)}>
                            {donation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className='cursor-pointer'
                              onClick={() => handleViewDonation(donation)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className='cursor-pointer'
                              onClick={() => handleEditDonation(donation)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className='cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10'
                              onClick={() => handleDeleteDonation(donation)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No donations found matching your criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredDonations.length)} of {filteredDonations.length} donations
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className='cursor-pointer'
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className='cursor-pointer'
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </RoleBasedLayout>

      {/* Manual Entry/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Donation' : 'Manual Donation Entry'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="donor">Donor Name *</Label>
              <Input
                id="donor"
                name="donor"
                value={formData.donor}
                onChange={handleInputChange}
                placeholder="Enter donor name"
                className={errors.donor ? 'border-red-500' : ''}
              />
              {errors.donor && <p className="text-sm text-red-500">{errors.donor}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (MWK) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="Enter donation amount"
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="method">Payment Method *</Label>
                <Select 
                  value={formData.method} 
                  onValueChange={(value) => handleSelectChange('method', value)}
                >
                  <SelectTrigger className={errors.method ? 'border-red-500 cursor-pointer' : 'cursor-pointer'}>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className='cursor-pointer'>
                    <SelectItem value="Card Payment">Card Payment</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
                {errors.method && <p className="text-sm text-red-500">{errors.method}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select 
                  value={formData.project} 
                  onValueChange={(value) => handleSelectChange('project', value)}
                >
                  <SelectTrigger className={errors.project ? 'border-red-500 cursor-pointer' : 'cursor-pointer'}>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectsLoading ? (
                      <SelectItem value="" disabled>Loading projects...</SelectItem>
                    ) : (
                      <>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.name}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {errors.project && <p className="text-sm text-red-500">{errors.project}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger className='cursor-pointer'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes about this donation"
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                id="recurring"
                name="recurring"
                type="checkbox"
                checked={formData.recurring}
                onChange={handleInputChange}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="recurring">Recurring donation</Label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className='cursor-pointer'
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className='cursor-pointer'>
                {isEditing ? 'Update Donation' : 'Add Donation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Donation Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Donation Details</DialogTitle>
          </DialogHeader>
          {viewingDonation && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Donor</p>
                  <p className="font-medium">{viewingDonation.donor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(viewingDonation.amount)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{viewingDonation.method}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Project</p>
                  <p className="font-medium">{viewingDonation.project}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDateTime(viewingDonation.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(viewingDonation.status)}>
                    {viewingDonation.status}
                  </Badge>
                </div>
              </div>
              
              {viewingDonation.recurring && (
                <div>
                  <p className="text-sm text-muted-foreground">Recurring</p>
                  <Badge className="bg-blue-100 text-blue-800">Monthly Subscription</Badge>
                </div>
              )}
              
              {viewingDonation.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{viewingDonation.notes}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">{viewingDonation.createdBy || 'Unknown User'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">
                    {viewingDonation.createdAt 
                      ? formatDateTime(viewingDonation.createdAt.toString()) 
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this donation from <strong>{donationToDelete?.donor}</strong> for <strong>{donationToDelete && formatCurrency(donationToDelete.amount)}</strong>?</p>
            <p className="text-sm text-muted-foreground mt-2">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              className='cursor-pointer'
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className='cursor-pointer'
              onClick={confirmDeleteDonation}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}