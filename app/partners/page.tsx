'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getCountFromServer } from 'firebase/firestore'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { Handshake, Users, FolderOpen, Clock, Plus, Edit, Trash2, Eye, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { XIcon } from 'lucide-react'
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
}

interface Partner {
  id: string
  name: string
  type: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  website?: string
  description?: string
  activeProjects?: number
  projectIds?: string[]
  lastContact?: string
  status: string
  createdAt?: Date
  createdBy?: string
  updatedAt?: Date
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 10
  
  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Active')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  
  const { user } = useAuth()

  // Fetch projects and partners
  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    fetchPartners()
  }, [searchTerm, filterType, currentPage])

  const fetchProjects = async () => {
    try {
      const projectsQuery = query(collection(db, 'projects'), orderBy('name'))
      const querySnapshot = await getDocs(projectsQuery)
      const projectsData: Project[] = []
      
      querySnapshot.forEach((doc) => {
        projectsData.push({
          id: doc.id,
          name: doc.data().name || ''
        })
      })
      
      setProjects(projectsData)
    } catch (error: any) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to fetch projects. Please try again.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const fetchPartners = async () => {
    try {
      setLoading(true)
      let partnersQuery = query(collection(db, 'partners'), orderBy('createdAt', 'desc'))
      let hasSearchFilter = false;
      
      // Apply type filter
      if (filterType && filterType !== 'all') {
        partnersQuery = query(partnersQuery, where('type', '==', filterType))
      }
      
      // Get total count for pagination (before search filtering)
      const countSnapshot = await getCountFromServer(partnersQuery)
      const totalItems = countSnapshot.data().count
      setTotalCount(totalItems)
      const totalPagesCount = Math.ceil(totalItems / ITEMS_PER_PAGE)
      setTotalPages(totalPagesCount)
      
      // Apply pagination
      const querySnapshot = await getDocs(partnersQuery)
      const allPartnersData: Partner[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        allPartnersData.push({
          id: doc.id,
          name: data.name || '',
          type: data.type || '',
          contactPerson: data.contactPerson || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          website: data.website || '',
          description: data.description || '',
          activeProjects: data.projectIds ? data.projectIds.length : (data.activeProjects || 0),
          projectIds: data.projectIds || [],
          lastContact: data.lastContact || '',
          status: data.status || 'Active',
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy || 'Unknown User',
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      })
      
      // Apply search filter on client-side after fetching
      let filteredPartners = allPartnersData;
      if (searchTerm) {
        hasSearchFilter = true;
        const searchTermLower = searchTerm.toLowerCase()
        filteredPartners = allPartnersData.filter(partner => {
          const nameLower = partner.name.toLowerCase()
          const typeLower = partner.type.toLowerCase()
          return nameLower.includes(searchTermLower) || typeLower.includes(searchTermLower)
        })
      }
      
      // Update total count based on filtered results
      const filteredTotalItems = filteredPartners.length;
      const filteredTotalPagesCount = Math.ceil(filteredTotalItems / ITEMS_PER_PAGE)
      
      // Apply client-side pagination
      const startIndexForSlice = (currentPage - 1) * ITEMS_PER_PAGE
      const paginatedPartners = filteredPartners.slice(startIndexForSlice, startIndexForSlice + ITEMS_PER_PAGE)
      setPartners(paginatedPartners)
      
      // Update counts for pagination display
      setTotalCount(filteredTotalItems)
      setTotalPages(filteredTotalPagesCount > 0 ? filteredTotalPagesCount : 1)
      
      // Reset to last page if current page exceeds total pages
      if (currentPage > filteredTotalPagesCount && filteredTotalPagesCount > 0) {
        setCurrentPage(filteredTotalPagesCount)
      }
    } catch (error: any) {
      console.error('Error fetching partners:', error)
      toast.error('Failed to fetch partners. Please try again.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setLoading(false)
    }
  }

  // Check if user has permission to manage partners
  const canManagePartners = user?.role === 'executive director' || user?.role === 'finance lead' || user?.role === 'programs lead'
  const canDeletePartners = user?.role === 'executive director'

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canManagePartners) {
      toast.error('You do not have permission to create partners', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    if (!name || !type) {
      toast.error('Please fill in all required fields', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    setIsSubmitting(true)
    try {
      const newPartner = {
        name,
        type,
        contactPerson: contactPerson || '',
        email: email || '',
        phone: phone || '',
        address: address || '',
        website: website || '',
        description: description || '',
        projectIds: selectedProjectIds,
        activeProjects: selectedProjectIds.length,
        status,
        createdAt: new Date(),
        createdBy: user?.displayName || user?.email || 'Unknown User',
        updatedAt: new Date()
      }
      
      await addDoc(collection(db, 'partners'), newPartner)
      
      toast.success('Partner created successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      resetForm()
      setShowCreateDialog(false)
      // Reset to first page when new item is added
      setCurrentPage(1)
      fetchPartners()
    } catch (error: any) {
      console.error('Error creating partner:', error)
      toast.error(error.message || 'Failed to create partner', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canManagePartners || !selectedPartner) {
      toast.error('You do not have permission to update partners', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    if (!name || !type || !selectedPartner) {
      toast.error('Please fill in all required fields', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    setIsSubmitting(true)
    try {
      const updatedPartner = {
        name,
        type,
        contactPerson: contactPerson || '',
        email: email || '',
        phone: phone || '',
        address: address || '',
        website: website || '',
        description: description || '',
        projectIds: selectedProjectIds,
        activeProjects: selectedProjectIds.length,
        status,
        updatedAt: new Date()
      }
      
      await updateDoc(doc(db, 'partners', selectedPartner.id), updatedPartner)
      
      toast.success('Partner updated successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      resetForm()
      setShowEditDialog(false)
      fetchPartners()
    } catch (error: any) {
      console.error('Error updating partner:', error)
      toast.error(error.message || 'Failed to update partner', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePartner = async () => {
    if (!canDeletePartners || !selectedPartner) {
      toast.error('You do not have permission to delete partners', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    if (!selectedPartner) return
    
    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, 'partners', selectedPartner.id))
      
      toast.success('Partner deleted successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      setShowDeleteDialog(false)
      setSelectedPartner(null)
      fetchPartners()
    } catch (error: any) {
      console.error('Error deleting partner:', error)
      toast.error(error.message || 'Failed to delete partner', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setName('')
    setType('')
    setContactPerson('')
    setEmail('')
    setPhone('')
    setAddress('')
    setWebsite('')
    setDescription('')
    setStatus('Active')
    setSelectedProjectIds([])
  }

  const openCreateDialog = () => {
    if (!canManagePartners) {
      toast.error('You do not have permission to create partners', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    resetForm()
    setShowCreateDialog(true)
  }

  const openEditDialog = (partner: Partner) => {
    if (!canManagePartners) {
      toast.error('You do not have permission to edit partners', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    setSelectedPartner(partner)
    setName(partner.name)
    setType(partner.type)
    setContactPerson(partner.contactPerson || '')
    setEmail(partner.email || '')
    setPhone(partner.phone || '')
    setAddress(partner.address || '')
    setWebsite(partner.website || '')
    setDescription(partner.description || '')
    setStatus(partner.status)
    setSelectedProjectIds(partner.projectIds || [])
    setShowEditDialog(true)
  }

  const openDeleteDialog = (partner: Partner) => {
    if (!canDeletePartners) {
      toast.error('You do not have permission to delete partners', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    setSelectedPartner(partner)
    setShowDeleteDialog(true)
  }

  const openViewDialog = (partner: Partner) => {
    setSelectedPartner(partner)
    setShowViewDialog(true)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Create a stable onChange handler for MultiSelect to prevent infinite loops
  const handleProjectSelectionChange = React.useCallback((newSelected: string[]) => {
    setSelectedProjectIds(newSelected);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
      case 'Inactive':
        return <Badge className="bg-gray-100 text-gray-800 font-medium">Inactive</Badge>
      case 'Follow-up Due':
        return <Badge className="bg-yellow-100 text-yellow-800 font-medium">Follow-up Due</Badge>
      case 'Archived':
        return <Badge className="bg-red-100 text-blue-800 font-medium">Archived</Badge>
      default:
        return <Badge className="bg-green-100 text-green-800 font-medium">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {type}
      </Badge>
    )
  }

  return (
    <ProtectedRoute>
      <RoleBasedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Partner Organization Management</h1>
              <p className="text-muted-foreground">Track relationships with partner organizations</p>
            </div>
            {canManagePartners && (
              <Button className="font-medium shadow-md cursor-pointer" onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Partner
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Partners</p>
                    <p className="text-2xl font-bold text-foreground">{totalCount}</p>
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
                    <p className="text-2xl font-bold text-foreground">
                      {partners.filter(p => p.status === 'Active').length}
                    </p>
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
                    <p className="text-2xl font-bold text-foreground">
                      {partners.reduce((sum, partner) => sum + (partner.activeProjects || 0), 0)}
                    </p>
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
                    <p className="text-2xl font-bold text-foreground">
                      {partners.filter(p => p.status === 'Follow-up Due').length}
                    </p>
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
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search partners..."
                      className="pl-10 flex-1"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1) // Reset to first page when search changes
                      }}
                    />
                  </div>
                  <Select value={filterType} onValueChange={(value) => {
                    setFilterType(value)
                    setCurrentPage(1) // Reset to first page when filter changes
                  }}>
                    <SelectTrigger className="w-full md:w-48 font-medium border-border cursor-pointer">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="NGO">NGO</SelectItem>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="International">International</SelectItem>
                      <SelectItem value="Private Sector">Private Sector</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : partners.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterType !== 'all' 
                      ? 'No partners found matching your search criteria.' 
                      : 'No partners found. Create your first partner organization.'}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Organization</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Active Projects</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partners.map((partner) => (
                          <TableRow key={partner.id}>
                            <TableCell className="font-medium text-foreground">{partner.name}</TableCell>
                            <TableCell>{getTypeBadge(partner.type)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {partner.contactPerson || 'N/A'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {partner.activeProjects || 0}
                            </TableCell>
                            <TableCell>{getStatusBadge(partner.status)}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openViewDialog(partner)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canManagePartners && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(partner)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                {canDeletePartners && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(partner)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer" 
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} partners
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
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </RoleBasedLayout>

      {/* Create Partner Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Partner</DialogTitle>
            <DialogDescription>
              Add a new partner organization to the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePartner}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter organization name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Partner Type *</Label>
                <Select value={type} onValueChange={setType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGO">NGO</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                    <SelectItem value="Private Sector">Private Sector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Enter contact person name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Follow-up Due">Follow-up Due</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="projects">Associated Projects (Optional)</Label>
                <Select onValueChange={(value) => {
                  if (value && !selectedProjectIds.includes(value)) {
                    setSelectedProjectIds([...selectedProjectIds, value]);
                  }
                }}>
                  <SelectTrigger className='cursor-pointer'>
                    <SelectValue placeholder="Select projects" />
                  </SelectTrigger>
                  <SelectContent className='cursor-pointer'>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedProjectIds.map((projectId) => {
                    const project = projects.find(p => p.id === projectId);
                    return project ? (
                      <Badge key={projectId} variant="secondary" className="mr-1">
                        {project.name}
                        <span
                          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                          onClick={() => setSelectedProjectIds(selectedProjectIds.filter(id => id !== projectId))}
                        >
                          <XIcon className="h-3 w-3" />
                        </span>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter physical address"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="Enter website URL"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter partner description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                className='cursor-pointer'
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className='cursor-pointer'>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Partner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Partner Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partner Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedPartner?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedPartner && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Organization Name</h3>
                  <p className="font-medium">{selectedPartner.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Partner Type</h3>
                  <p>{selectedPartner.type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Contact Person</h3>
                  <p>{selectedPartner.contactPerson || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{selectedPartner.email || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                  <p>{selectedPartner.phone || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <p>{selectedPartner.status}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Associated Projects</h3>
                  <div className="mt-1">
                    {selectedPartner.projectIds && selectedPartner.projectIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedPartner.projectIds.map((projectId) => {
                          const project = projects.find(p => p.id === projectId)
                          return project ? (
                            <Badge key={projectId} variant="secondary">
                              {project.name}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No projects associated</p>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                  <p>{selectedPartner.address || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Website</h3>
                  <p>{selectedPartner.website || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Projects</h3>
                  <p>{selectedPartner.activeProjects || 0}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p>{selectedPartner.description || 'N/A'}</p>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Created By</h3>
                    <p>{selectedPartner.createdBy || 'Unknown User'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Creation Date</h3>
                    <p>{selectedPartner.createdAt?.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className='cursor-pointer' onClick={() => setShowViewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Partner Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Partner</DialogTitle>
            <DialogDescription>
              Update information for {selectedPartner?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedPartner && (
            <form onSubmit={handleUpdatePartner}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Organization Name *</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter organization name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Partner Type *</Label>
                  <Select value={type} onValueChange={setType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select partner type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NGO">NGO</SelectItem>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="International">International</SelectItem>
                      <SelectItem value="Private Sector">Private Sector</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contactPerson">Contact Person</Label>
                  <Input
                    id="edit-contactPerson"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Enter contact person name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Follow-up Due">Follow-up Due</SelectItem>
                      <SelectItem value="Archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-projects">Associated Projects (Optional)</Label>
                  <Select onValueChange={(value) => {
                    if (value && !selectedProjectIds.includes(value)) {
                      setSelectedProjectIds([...selectedProjectIds, value]);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select projects" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedProjectIds.map((projectId) => {
                      const project = projects.find(p => p.id === projectId);
                      return project ? (
                        <Badge key={projectId} variant="secondary" className="mr-1">
                          {project.name}
                          <span
                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                            onClick={() => setSelectedProjectIds(selectedProjectIds.filter(id => id !== projectId))}
                          >
                            <XIcon className="h-3 w-3" />
                          </span>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter physical address"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Enter website URL"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter partner description"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className='cursor-pointer'
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className='cursor-pointer'>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Partner
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Partner Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Partner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedPartner?.name}</span>? 
              This action cannot be undone and will permanently remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="w-auto cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePartner}
              disabled={isDeleting}
              className="w-auto cursor-pointer"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}