'use client'

import { useState, useEffect } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Search, Edit, Eye } from "lucide-react"
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'

interface Distribution {
  id: string
  resourceId: string
  resourceName: string
  quantity: number
  unitValue: number
  totalValue: number
  recipient: string
  location: string
  notes: string
  date: string
  status: string
  createdAt: Date
  category?: string
}

interface DistributionHistoryProps {
  canPerformActions?: boolean;
}

const ITEMS_PER_PAGE = 10
const STATUS_OPTIONS = ['pending', 'in progress', 'completed']

export function DistributionHistory({ canPerformActions = true }: DistributionHistoryProps) {
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [filteredDistributions, setFilteredDistributions] = useState<Distribution[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>(['all'])
  
  // View/Edit dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingDistribution, setViewingDistribution] = useState<Distribution | null>(null)
  
  // Get user from auth context
  const { user } = useAuth()
  const userRole = user?.role || 'office assistant'

  // Check if user can update status
  const canUpdateStatus = () => {
    if (!canPerformActions) return false;
    
    const allowedRoles = ['finance lead', 'executive director', 'programs lead']
    const normalizedRole = userRole.toLowerCase()
    return allowedRoles.includes(normalizedRole)
  }

  // Test API route function
  const testApiRoute = async (distributionId: string) => {
    console.log('=== Testing API Route ===')
    console.log('Distribution ID:', distributionId)
    
    try {
      const testUrl = `/api/distributions/${distributionId}`
      console.log('Testing GET to:', testUrl)
      
      const testResponse = await fetch(testUrl)
      console.log('GET Response status:', testResponse.status)
      
      if (testResponse.ok) {
        const testData = await testResponse.json()
        console.log('GET Response data:', testData)
        return testData
      } else {
        const errorText = await testResponse.text()
        console.log('GET Error response:', errorText)
        return { error: errorText }
      }
    } catch (error) {
      console.error('Test failed:', error)
      return { error }
    }
  }

  // Fetch distribution history
  useEffect(() => {
    const fetchDistributions = async () => {
      try {
        console.log('Fetching distributions...')
        const response = await fetch(`/api/distributions`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch distributions: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Distributions data received:', data)
        
        if (data.distributions) {
          const distributionsData: Distribution[] = data.distributions.map((dist: any) => ({
            id: dist.id,
            resourceId: dist.resourceId,
            resourceName: dist.resourceName,
            quantity: dist.quantity,
            unitValue: dist.unitValue,
            totalValue: dist.totalValue,
            recipient: dist.recipient,
            location: dist.location,
            notes: dist.notes,
            date: dist.date,
            status: dist.status,
            createdAt: dist.createdAt?.toDate ? dist.createdAt.toDate() : new Date(dist.createdAt),
            category: dist.category
          }))
          
          console.log('Processed distributions:', distributionsData)
          setDistributions(distributionsData)
          setFilteredDistributions(distributionsData)
          setTotalPages(Math.ceil(distributionsData.length / ITEMS_PER_PAGE))
          
          // Extract unique categories for filter
          const uniqueCategories = Array.from(new Set(distributionsData.map(d => d.category || 'Unknown')))
          setCategories(['all', ...uniqueCategories])
        } else {
          console.error('No distributions data found in response')
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error fetching distributions:', error)
        toast.error('Failed to load distribution history', {
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }
        })
        setLoading(false)
      }
    }

    fetchDistributions()
  }, [])

  // Debug distributions when they load
  useEffect(() => {
    if (distributions.length > 0) {
      console.log('Distributions loaded:', distributions.length)
      console.log('Sample distribution ID:', distributions[0]?.id)
      console.log('Sample distribution:', distributions[0])
    }
  }, [distributions])

  // Apply filters
  useEffect(() => {
    let result = [...distributions]
    
    // Apply search filter (resource name or recipient)
    if (searchTerm) {
      result = result.filter(dist => 
        dist.resourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dist.recipient.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(dist => dist.category === selectedCategory)
    }
    
    // Update filtered distributions and pagination
    setFilteredDistributions(result)
    setTotalPages(Math.ceil(result.length / ITEMS_PER_PAGE))
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchTerm, selectedCategory, distributions])

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Get current page distributions
  const getCurrentPageDistributions = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredDistributions.slice(startIndex, endIndex)
  }

 // Enhanced update distribution status function
  const updateDistributionStatus = async (distributionId: string, newStatus: string) => {
    // Check if user has permission to update status
    if (!canUpdateStatus()) {
      toast.error('You do not have permission to update distribution status', {
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      return
    }
    
    // Enhanced validation
    if (!distributionId || 
        distributionId.trim() === '' || 
        distributionId === 'undefined' || 
        distributionId === 'null') {
      console.error('Invalid distribution ID:', distributionId)
      toast.error('Invalid distribution ID. Please try again.', {
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      return
    }
    
    console.log('=== Starting Status Update Process ===')
    console.log('Distribution ID:', distributionId)
    console.log('New Status:', newStatus)
    
    try {
      // Now update the status
      const updateUrl = `/api/distributions/${distributionId}`
      console.log('Making PUT request to:', updateUrl)
      
      const updatePayload = { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      }
      
      console.log('Update payload:', updatePayload)
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      })
      
      console.log('Update response status:', response.status)
      console.log('Update response ok:', response.ok)
      
      if (!response.ok) {
        let errorMessage = 'Failed to update distribution status'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.error('Update error details:', errorData)
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          const errorText = await response.text()
          errorMessage = `Server error: ${response.status} ${response.statusText} - ${errorText}`
        }
        
        throw new Error(errorMessage)
      }
      
      const result = await response.json()
      console.log('Update successful:', result)
      
      // Update local state
      setDistributions(prev => prev.map(dist => 
        dist.id === distributionId ? { ...dist, status: newStatus } : dist
      ))
      
      setFilteredDistributions(prev => prev.map(dist => 
        dist.id === distributionId ? { ...dist, status: newStatus } : dist
      ))
      
      // Also update viewing distribution if it's the same one
      if (viewingDistribution && viewingDistribution.id === distributionId) {
        setViewingDistribution({ ...viewingDistribution, status: newStatus })
      }
      
      toast.success('Distribution status updated successfully', {
        style: {
          background: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
      
    } catch (error: any) {
      console.error('Error updating distribution status:', error)
      toast.error(error.message || 'Failed to update distribution status', {
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    }
  }

  // View distribution details
  const viewDistribution = (distribution: Distribution) => {
    console.log('Viewing distribution:', distribution)
    setViewingDistribution(distribution)
    setIsViewDialogOpen(true)
  }

  if (loading && currentPage === 1) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Distribution History</CardTitle>
          <CardDescription>Track all resource distributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Distribution History</CardTitle>
        <CardDescription>Track all resource distributions</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by resource or recipient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
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
        </div>
        
        {filteredDistributions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No distributions recorded yet</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    {(canPerformActions || canUpdateStatus()) && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCurrentPageDistributions().map((distribution) => (
                    <TableRow key={distribution.id}>
                      <TableCell>{distribution.date}</TableCell>
                      <TableCell className="font-medium">{distribution.resourceName}</TableCell>
                      <TableCell>{distribution.category || 'Unknown'}</TableCell>
                      <TableCell>{distribution.quantity}</TableCell>
                      <TableCell>
                        {distribution.totalValue ? `K${distribution.totalValue.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>{distribution.recipient}</TableCell>
                      <TableCell>{distribution.location}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            distribution.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : distribution.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {distribution.status.charAt(0).toUpperCase() + distribution.status.slice(1)}
                        </Badge>
                      </TableCell>
                      {(canPerformActions || canUpdateStatus()) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => viewDistribution(distribution)}
                              className="cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canUpdateStatus() && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setViewingDistribution(distribution)
                                  setIsViewDialogOpen(true)
                                }}
                                className="cursor-pointer"
                                title="View and Edit Status"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredDistributions.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredDistributions.length)} of {filteredDistributions.length} distributions
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    className='cursor-pointer'
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    className='cursor-pointer'
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      {/* View Distribution Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Distribution Details</DialogTitle>
          </DialogHeader>
          {viewingDistribution && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Resource</Label>
                  <p className="font-medium">{viewingDistribution.resourceName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                  <p className="font-medium">{viewingDistribution.category || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                  <p className="font-medium">{viewingDistribution.quantity}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Unit Value</Label>
                  <p className="font-medium">K{viewingDistribution.unitValue?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total Value</Label>
                  <p className="font-medium">K{viewingDistribution.totalValue?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge 
                    className={
                      viewingDistribution.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : viewingDistribution.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                    }
                  >
                    {viewingDistribution.status.charAt(0).toUpperCase() + viewingDistribution.status.slice(1)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Recipient</Label>
                  <p className="font-medium">{viewingDistribution.recipient}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <p className="font-medium">{viewingDistribution.location}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p className="font-medium">{viewingDistribution.date}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                <p className="mt-1">{viewingDistribution.notes || 'No notes provided'}</p>
              </div>
              {canUpdateStatus() && (
                <div className="flex justify-between items-center pt-4 border-t">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Update Status</Label>
                    <Select 
                      value={viewingDistribution.status} 
                      onValueChange={(value) => {
                        console.log('Status change triggered for:', viewingDistribution.id)
                        updateDistributionStatus(viewingDistribution.id, value)
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                </div>
              )}
              {!canUpdateStatus() && (
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}