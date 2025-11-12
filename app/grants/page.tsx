'use client'

import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { Banknote, FileText, TrendingUp, Clock, Plus, Edit, Trash2, Eye, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect, createContext, useContext } from "react"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Define Grant type
type Grant = {
  id?: string
  name: string
  funder: string
  amount: number
  status: string
  utilizationRate: number
  reportsDue: number
  description?: string
  startDate?: Date
  endDate?: Date
  createdAt?: Date
  updatedAt?: Date
  projectId?: string
}

// Add Project type
type Project = {
  id: string
  name: string
}

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentGrant, setCurrentGrant] = useState<Grant | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewGrant, setViewGrant] = useState<Grant | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [grantToDelete, setGrantToDelete] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Fetch grants from API
  const fetchGrants = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/grants')
      const data = await response.json()
      
      if (response.ok) {
        setGrants(data.grants)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch grants')
        toast.error(data.error || 'Failed to fetch grants', {
          description: 'Unable to load grants data',
          duration: 5000,
          style: { backgroundColor: '#fee2e2', color: '#991b1b' }
        })
      }
    } catch (err) {
      setError('Failed to connect to server')
      toast.error('Failed to connect to server', {
        description: 'Please check your connection and try again',
        duration: 5000,
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true)
      const response = await fetch('/api/projects')
      const data = await response.json()
      
      if (response.ok) {
        setProjects(data.projects || [])
      } else {
        toast.error('Failed to load projects', {
          description: 'Unable to load project data for selection',
          duration: 5000,
          style: { backgroundColor: '#fee2e2', color: '#991b1b' }
        })
      }
    } catch (err) {
      toast.error('Failed to connect to server', {
        description: 'Please check your connection and try again',
        duration: 5000,
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      console.error('Error fetching projects:', err)
    } finally {
      setLoadingProjects(false)
    }
  }

  // Create or update grant
  const saveGrant = async (grant: Grant) => {
    try {
      const method = grant.id ? 'PUT' : 'POST'
      const url = grant.id ? `/api/grants?id=${grant.id}` : '/api/grants'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(grant),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success(grant.id ? 'Grant updated successfully' : 'Grant created successfully', {
          description: grant.id ? 'The grant details have been updated' : 'A new grant has been added to the system',
          duration: 3000,
          style: { backgroundColor: '#dcfce7', color: '#166534' }
        })
        setIsDialogOpen(false)
        fetchGrants() // Refresh the list
      } else {
        toast.error('Operation failed', {
          description: data.error || `Failed to ${grant.id ? 'update' : 'create'} grant`,
          duration: 5000,
          style: { backgroundColor: '#fee2e2', color: '#991b1b' }
        })
      }
    } catch (err) {
      toast.error('Failed to connect to server', {
        description: 'Please check your connection and try again',
        duration: 5000,
        classNames: {
          toast: 'bg-red-100 border-red-200',
          title: 'text-red-800',
          description: 'text-red-600',
        },
      })
      console.error(err)
    }
  }

  // Delete grant
  const deleteGrant = async (id: string) => {
    try {
      const response = await fetch(`/api/grants?id=${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Grant deleted successfully', {
          description: 'The grant has been removed from the system',
          duration: 3000,
          style: { backgroundColor: '#dcfce7', color: '#166534' }
        })
        fetchGrants() // Refresh the list
      } else {
        toast.error('Failed to delete grant', {
          description: data.error || 'An error occurred while deleting the grant',
          duration: 5000,
          style: { backgroundColor: '#fee2e2', color: '#991b1b' }
        })
      }
    } catch (err) {
      toast.error('Failed to connect to server', {
        description: 'Please check your connection and try again',
        duration: 5000,
        classNames: {
          toast: 'bg-red-100 border-red-200',
          title: 'text-red-800',
          description: 'text-red-600',
        },
      })
      console.error(err)
    }
  }

  // Open dialog for creating a new grant
  const handleCreateGrant = () => {
    setCurrentGrant(null)
    setIsDialogOpen(true)
  }

  // Open dialog for editing a grant
  const handleEditGrant = (grant: Grant) => {
    setCurrentGrant(grant)
    setIsDialogOpen(true)
  }

  // Open dialog for viewing grant details
  const handleViewGrant = (grant: Grant) => {
    setViewGrant(grant)
    setIsViewDialogOpen(true)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'MWK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Load projects and grants on component mount
  useEffect(() => {
    fetchGrants()
    fetchProjects()
  }, [])

  // Calculate summary statistics
  const totalFunding = grants.reduce((sum, grant) => sum + grant.amount, 0)
  const activeGrants = grants.filter(grant => grant.status === 'active').length
  const avgUtilization = grants.length > 0 
    ? grants.reduce((sum, grant) => sum + grant.utilizationRate, 0) / grants.length 
    : 0
  const reportsDue = grants.filter(grant => grant.reportsDue > 0).length

  // Open delete confirmation dialog
  const confirmDeleteGrant = (id: string) => {
    setGrantToDelete(id)
    setShowDeleteDialog(true)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (grantToDelete) {
      deleteGrant(grantToDelete)
      setGrantToDelete(null)
    }
    setShowDeleteDialog(false)
  }

  // Add export to CSV function
  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = [
        'Name',
        'Funder',
        'Amount (MWK)',
        'Status',
        'Utilization Rate (%)',
        'Reports Due',
        'Project',
        'Start Date',
        'End Date',
        'Description'
      ].join(',');

      const rows = grants.map(grant => {
        // Find project name if projectId exists
        const projectName = grant.projectId 
          ? projects.find(p => p.id === grant.projectId)?.name || 'Unknown Project'
          : 'No Project';

        return [
          `"${grant.name || ''}"`,
          `"${grant.funder || ''}"`,
          `"${grant.amount || 0}"`,
          `"${grant.status || ''}"`,
          `"${grant.utilizationRate || 0}"`,
          `"${grant.reportsDue || 0}"`,
          `"${projectName}"`,
          `"${grant.startDate ? new Date(grant.startDate).toLocaleDateString() : ''}"`,
          `"${grant.endDate ? new Date(grant.endDate).toLocaleDateString() : ''}"`,
          `"${grant.description ? grant.description.replace(/"/g, '""') : ''}"`
        ].join(',');
      });

      const csvContent = [headers, ...rows].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `grants-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Export successful', {
        description: 'Grants data has been exported to CSV file',
        duration: 3000,
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      });
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Export failed', {
        description: 'Failed to export grants data. Please try again.',
        duration: 5000,
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      });
    }
  };

  // Calculate pagination values
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentGrants = grants.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(grants.length / itemsPerPage)

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle previous page
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Handle next page
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Reset to first page when grants change
  useEffect(() => {
    setCurrentPage(1)
  }, [grants])

  // Create context value
  const grantsContextValue = {
    projects,
    loadingProjects
  }

  return (
    <ProtectedRoute>
      <RoleBasedLayout>
        <GrantsContext.Provider value={grantsContextValue}>
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Grant & Funding Management</h1>
                <p className="text-muted-foreground">Manage grants, funding sources, and compliance</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="font-medium border-border hover:bg-muted/50 hover:text-foreground bg-transparent cursor-pointer" onClick={exportToCSV}>
                 <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button className="font-medium shadow-md cursor-pointer" onClick={handleCreateGrant}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Grant
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Funding</p>
                      <p className="text-2xl font-bold text-foreground">
                        {loading ? 'Loading...' : formatCurrency(totalFunding)}
                      </p>
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
                      <p className="text-2xl font-bold text-foreground">
                        {loading ? 'Loading...' : activeGrants}
                      </p>
                    </div>
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg. Utilization</p>
                      <p className="text-2xl font-bold text-foreground">
                        {loading ? 'Loading...' : `${Math.round(avgUtilization)}%`}
                      </p>
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
                      <p className="text-2xl font-bold text-foreground">
                        {loading ? 'Loading...' : reportsDue}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Loading and Error States */}
            {loading && (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 text-destructive">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2 cursor-pointer"
                  onClick={fetchGrants}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Main Content */}
            {!loading && !error && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Grant Portfolio */}
                <Card className="bg-card border-border shadow-md">
                  <CardHeader className="border-b border-border bg-muted/20">
                    <CardTitle className="text-lg font-bold text-foreground">Grant Portfolio</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Overview of all grants and funding sources
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Grant Name</TableHead>
                          <TableHead>Funder</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentGrants.map((grant) => (
                          <TableRow key={grant.id}>
                            <TableCell className="font-medium text-foreground">{grant.name}</TableCell>
                            <TableCell className="text-muted-foreground">{grant.funder}</TableCell>
                            <TableCell className="text-muted-foreground">{formatCurrency(grant.amount)}</TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  grant.status === 'active' 
                                    ? 'bg-green-100 text-green-800 font-medium' 
                                    : grant.status === 'pending' 
                                      ? 'bg-yellow-100 text-yellow-800 font-medium' 
                                      : 'bg-gray-100 text-gray-800 font-medium'
                                }
                              >
                                {grant.status.charAt(0).toUpperCase() + grant.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="cursor-pointer"
                                  onClick={() => handleViewGrant(grant)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="cursor-pointer"
                                  onClick={() => handleEditGrant(grant)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="cursor-pointer"
                                  onClick={() => grant.id && confirmDeleteGrant(grant.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {grants.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No grants found. Click "Add Grant" to create your first grant.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination Controls */}
                    {grants.length > itemsPerPage && (
                      <div className="flex items-center justify-between border-t border-border p-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {Math.min(indexOfFirstItem + 1, grants.length)} to {Math.min(indexOfLastItem, grants.length)} of {grants.length} grants
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className="cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
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
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className="cursor-pointer"
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Compliance Tracking */}
                <Card className="bg-card border-border shadow-md">
                  <CardHeader className="border-b border-border bg-muted/20">
                    <CardTitle className="text-lg font-bold text-foreground">Compliance Tracking</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Monitor compliance requirements and deadlines
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {grants
                      .filter(grant => grant.reportsDue > 0)
                      .slice(0, 3)
                      .map((grant) => (
                        <div 
                          key={grant.id} 
                          className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/10"
                        >
                          <div>
                            <p className="font-medium text-foreground">{grant.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Reports Due: {grant.reportsDue}
                            </p>
                          </div>
                          <Badge 
                            className={
                              grant.reportsDue > 2 
                                ? 'bg-destructive/10 text-destructive font-medium' 
                                : grant.reportsDue > 0 
                                  ? 'bg-yellow-100 text-yellow-800 font-medium' 
                                  : 'bg-green-100 text-green-800 font-medium'
                            }
                          >
                            {grant.reportsDue > 2 ? 'Overdue' : grant.reportsDue > 0 ? 'Due Soon' : 'On Track'}
                          </Badge>
                        </div>
                      ))}
                    {grants.filter(grant => grant.reportsDue > 0).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        No compliance issues at this time
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Funding Utilization */}
            {!loading && !error && grants.length > 0 && (
              <Card className="bg-card border-border shadow-md">
                <CardHeader className="border-b border-border bg-muted/20">
                  <CardTitle className="text-lg font-bold text-foreground">Funding Utilization</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Track how grant funds are being utilized across programs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {grants.slice(0, 3).map((grant) => (
                    <div key={grant.id}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">{grant.name}</span>
                        <span className="text-sm text-muted-foreground font-medium">
                          {formatCurrency(grant.amount * grant.utilizationRate / 100)} / {formatCurrency(grant.amount)} ({grant.utilizationRate}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-2">
                        <div 
                          className={
                            grant.utilizationRate > 80 
                              ? 'bg-red-500 h-2 rounded-full' 
                              : grant.utilizationRate > 60 
                                ? 'bg-yellow-500 h-2 rounded-full' 
                                : 'bg-green-500 h-2 rounded-full'
                          } 
                          style={{ width: `${grant.utilizationRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Grant Form Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{currentGrant ? 'Edit Grant' : 'Add New Grant'}</DialogTitle>
                <DialogDescription>
                  {currentGrant 
                    ? 'Update the grant details below' 
                    : 'Enter the details for the new grant'}
                </DialogDescription>
              </DialogHeader>
              <GrantForm 
                grant={currentGrant} 
                onSave={saveGrant} 
                onCancel={() => setIsDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>

          {/* Grant View Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Grant Details</DialogTitle>
                <DialogDescription>
                  Detailed information about the grant
                </DialogDescription>
              </DialogHeader>
              {viewGrant && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{viewGrant.name}</h3>
                    <p className="text-muted-foreground text-sm">{viewGrant.description || 'No description provided'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Funder</p>
                      <p className="font-medium">{viewGrant.funder}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">{formatCurrency(viewGrant.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge 
                        className={
                          viewGrant.status === 'active' 
                            ? 'bg-green-100 text-green-800 font-medium' 
                            : viewGrant.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800 font-medium' 
                              : 'bg-gray-100 text-gray-800 font-medium'
                        }
                      >
                        {viewGrant.status.charAt(0).toUpperCase() + viewGrant.status.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Utilization Rate</p>
                      <p className="font-medium">{viewGrant.utilizationRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reports Due</p>
                      <p className="font-medium">{viewGrant.reportsDue}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">{formatDate(viewGrant.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">{formatDate(viewGrant.endDate)}</p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" className="cursor-pointer" onClick={() => setIsViewDialogOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete the grant
                  and remove all associated data.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" className="cursor-pointer" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteConfirm}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                >
                  Delete Grant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </GrantsContext.Provider>
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}

// Update the GrantForm component to include project selection
function GrantForm({ 
  grant, 
  onSave, 
  onCancel 
}: { 
  grant: Grant | null
  onSave: (grant: Grant) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<Grant>(grant || {
    name: '',
    funder: '',
    amount: 0,
    status: 'active',
    utilizationRate: 0,
    reportsDue: 0,
    description: '',
    startDate: new Date(),
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    projectId: ''
  })

  // Access projects from parent component
  const { projects, loadingProjects } = useGrantsContext()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' || name === 'utilizationRate' || name === 'reportsDue' 
        ? Number(value) 
        : value
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    // Handle the special "no-project" value
    const actualValue = value === 'no-project' ? '' : value;
    setFormData(prev => ({
      ...prev,
      [name]: actualValue
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground">Grant Name</label>
        <Input
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium text-foreground">Funder</label>
        <Input
          name="funder"
          value={formData.funder}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium text-foreground">Amount (MWK)</label>
        <Input
          name="amount"
          type="number"
          value={formData.amount}
          onChange={handleChange}
          required
        />
      </div>
      
      <div>
        <label className="text-sm font-medium text-foreground">Description</label>
        <Textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={3}
        />
      </div>
      
      <div>
        <label className="text-sm font-medium text-foreground">Project (Optional)</label>
        {loadingProjects ? (
          <div className="text-sm text-muted-foreground">Loading projects...</div>
        ) : (
          <Select 
            value={formData.projectId || 'no-project'} 
            onValueChange={(value) => handleSelectChange('projectId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-project">No Project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">Status</label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => handleSelectChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium text-foreground">Utilization Rate (%)</label>
          <Input
            name="utilizationRate"
            type="number"
            min="0"
            max="100"
            value={formData.utilizationRate}
            onChange={handleChange}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">Reports Due</label>
          <Input
            name="reportsDue"
            type="number"
            min="0"
            value={formData.reportsDue}
            onChange={handleChange}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-foreground">Start Date</label>
          <Input
            name="startDate"
            type="date"
            value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              startDate: e.target.value ? new Date(e.target.value) : undefined
            }))}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-foreground">End Date</label>
          <Input
            name="endDate"
            type="date"
            value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              endDate: e.target.value ? new Date(e.target.value) : undefined
            }))}
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button type="button" className="cursor-pointer" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="cursor-pointer">
          {grant ? 'Update Grant' : 'Create Grant'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Create a context to share projects data with the form
const GrantsContext = createContext<{
  projects: Project[]
  loadingProjects: boolean
}>({
  projects: [],
  loadingProjects: true
})

function useGrantsContext() {
  return useContext(GrantsContext)
}
