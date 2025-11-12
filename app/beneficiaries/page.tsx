'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getCountFromServer, Timestamp } from 'firebase/firestore'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { UserCheck, Users, MapPin, Plus, Edit, Trash2, Eye, Search, ChevronLeft, ChevronRight, Loader2, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'sonner'

interface Project {
  id: string
  name: string
}

interface Program {
  id: string
  name: string
  projectId: string
}

interface Beneficiary {
  id: string
  name: string
  age: number
  gender: string
  community: string
  address?: string
  phone?: string
  email?: string
  description?: string
  projectIds?: string[]
  programIds?: string[]
  status: string
  createdAt?: Date
  createdBy?: string
  updatedAt?: Date
}

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProgram, setFilterProgram] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 10
  
  // Form state
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [community, setCommunity] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('Active')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])
  
  const { user } = useAuth()

  // Check if user has permission to manage beneficiaries
  const canManageBeneficiaries = user?.role === 'executive director' || user?.role === 'finance lead' || user?.role === 'programs lead'
  const canDeleteBeneficiaries = user?.role === 'executive director'

  // Fetch projects, programs and beneficiaries
  useEffect(() => {
    fetchProjectsAndPrograms()
  }, [])

  useEffect(() => {
    fetchBeneficiaries()
  }, [searchTerm, filterProgram, currentPage])

  const fetchProjectsAndPrograms = async () => {
    try {
      // Fetch projects
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
      
      // Fetch only active programs
      const programsQuery = query(
        collection(db, 'programs'), 
        where('status', '==', 'active'),
        orderBy('name')
      )
      const programsSnapshot = await getDocs(programsQuery)
      const programsData: Program[] = []
      
      programsSnapshot.forEach((doc) => {
        const data = doc.data()
        programsData.push({
          id: doc.id,
          name: data.name || '',
          projectId: data.projectId || ''
        })
      })
      
      setPrograms(programsData)
    } catch (error: any) {
      console.error('Error fetching projects and programs:', error)
      toast.error('Failed to fetch projects and programs. Please try again.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const fetchBeneficiaries = async () => {
    try {
      setLoading(true)
      let beneficiariesQuery = query(collection(db, 'beneficiaries'), orderBy('createdAt', 'desc'))
      
      // Apply program filter
      if (filterProgram && filterProgram !== 'all') {
        beneficiariesQuery = query(beneficiariesQuery, where('programIds', 'array-contains', filterProgram))
      }
      
      // Get total count for pagination (before search filtering)
      const countSnapshot = await getCountFromServer(beneficiariesQuery)
      const totalItems = countSnapshot.data().count
      setTotalCount(totalItems)
      const totalPagesCount = Math.ceil(totalItems / ITEMS_PER_PAGE)
      setTotalPages(totalPagesCount)
      
      // Apply pagination
      const querySnapshot = await getDocs(beneficiariesQuery)
      const allBeneficiariesData: Beneficiary[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        allBeneficiariesData.push({
          id: doc.id,
          name: data.name || '',
          age: data.age || 0,
          gender: data.gender || '',
          community: data.community || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          description: data.description || '',
          projectIds: data.projectIds || [],
          programIds: data.programIds || [],
          status: data.status || 'Active',
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy || 'Unknown User',
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      })
      
      // Apply search filter on client-side after fetching
      let filteredBeneficiaries = allBeneficiariesData;
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase()
        filteredBeneficiaries = allBeneficiariesData.filter(beneficiary => {
          const nameLower = beneficiary.name.toLowerCase()
          const communityLower = beneficiary.community.toLowerCase()
          return nameLower.includes(searchTermLower) || communityLower.includes(searchTermLower)
        })
      }
      
      // Update total count based on filtered results
      const filteredTotalItems = filteredBeneficiaries.length;
      const filteredTotalPagesCount = Math.ceil(filteredTotalItems / ITEMS_PER_PAGE)
      
      // Apply client-side pagination
      const startIndexForSlice = (currentPage - 1) * ITEMS_PER_PAGE
      const paginatedBeneficiaries = filteredBeneficiaries.slice(startIndexForSlice, startIndexForSlice + ITEMS_PER_PAGE)
      setBeneficiaries(paginatedBeneficiaries)
      
      // Update counts for pagination display
      setTotalCount(filteredTotalItems)
      setTotalPages(filteredTotalPagesCount > 0 ? filteredTotalPagesCount : 1)
      
      // Reset to last page if current page exceeds total pages
      if (currentPage > filteredTotalPagesCount && filteredTotalPagesCount > 0) {
        setCurrentPage(filteredTotalPagesCount)
      }
    } catch (error: any) {
      console.error('Error fetching beneficiaries:', error)
      toast.error('Failed to fetch beneficiaries. Please try again.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canManageBeneficiaries) {
      toast.error('You do not have permission to create beneficiaries', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    if (!name || !age || !gender || !community) {
      toast.error('Please fill in all required fields', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    setIsSubmitting(true)
    try {
      const newBeneficiary = {
        name,
        age: parseInt(age) || 0,
        gender,
        community,
        address: address || '',
        phone: phone || '',
        email: email || '',
        description: description || '',
        projectIds: selectedProjectIds,
        programIds: selectedProgramIds,
        status,
        createdAt: new Date(),
        createdBy: user?.displayName || user?.email || 'Unknown User',
        updatedAt: new Date()
      }
      
      await addDoc(collection(db, 'beneficiaries'), newBeneficiary)
      
      toast.success('Beneficiary created successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      resetForm()
      setShowCreateDialog(false)
      // Reset to first page when new item is added
      setCurrentPage(1)
      fetchBeneficiaries()
    } catch (error: any) {
      console.error('Error creating beneficiary:', error)
      toast.error(error.message || 'Failed to create beneficiary', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canManageBeneficiaries || !selectedBeneficiary) {
      toast.error('You do not have permission to update beneficiaries', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    if (!name || !age || !gender || !community || !selectedBeneficiary) {
      toast.error('Please fill in all required fields', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    setIsSubmitting(true)
    try {
      const updatedBeneficiary = {
        name,
        age: parseInt(age) || 0,
        gender,
        community,
        address: address || '',
        phone: phone || '',
        email: email || '',
        description: description || '',
        projectIds: selectedProjectIds,
        programIds: selectedProgramIds,
        status,
        updatedAt: new Date()
      }
      
      await updateDoc(doc(db, 'beneficiaries', selectedBeneficiary.id), updatedBeneficiary)
      
      toast.success('Beneficiary updated successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      resetForm()
      setShowEditDialog(false)
      fetchBeneficiaries()
    } catch (error: any) {
      console.error('Error updating beneficiary:', error)
      toast.error(error.message || 'Failed to update beneficiary', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBeneficiary = async () => {
    if (!canDeleteBeneficiaries || !selectedBeneficiary) {
      toast.error('You do not have permission to delete beneficiaries', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    
    if (!selectedBeneficiary) return
    
    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, 'beneficiaries', selectedBeneficiary.id))
      
      toast.success('Beneficiary deleted successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      setShowDeleteDialog(false)
      setSelectedBeneficiary(null)
      fetchBeneficiaries()
    } catch (error: any) {
      console.error('Error deleting beneficiary:', error)
      toast.error(error.message || 'Failed to delete beneficiary', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setName('')
    setAge('')
    setGender('')
    setCommunity('')
    setAddress('')
    setPhone('')
    setEmail('')
    setDescription('')
    setStatus('Active')
    setSelectedProjectIds([])
    setSelectedProgramIds([])
  }

  const openCreateDialog = () => {
    if (!canManageBeneficiaries) {
      toast.error('You do not have permission to create beneficiaries', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    resetForm()
    setShowCreateDialog(true)
  }

  const openViewDialog = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary)
    setShowViewDialog(true)
  }

  const openEditDialog = (beneficiary: Beneficiary) => {
    if (!canManageBeneficiaries) {
      toast.error('You do not have permission to edit beneficiaries', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    setSelectedBeneficiary(beneficiary)
    setName(beneficiary.name)
    setAge(beneficiary.age.toString())
    setGender(beneficiary.gender)
    setCommunity(beneficiary.community)
    setAddress(beneficiary.address || '')
    setPhone(beneficiary.phone || '')
    setEmail(beneficiary.email || '')
    setDescription(beneficiary.description || '')
    setStatus(beneficiary.status)
    setSelectedProjectIds(beneficiary.projectIds || [])
    setSelectedProgramIds(beneficiary.programIds || [])
    setShowEditDialog(true)
  }

  
  const openDeleteDialog = (beneficiary: Beneficiary) => {
    if (!canDeleteBeneficiaries) {
      toast.error('You do not have permission to delete beneficiaries', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    setSelectedBeneficiary(beneficiary)
    setShowDeleteDialog(true)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800 font-medium">Active</Badge>
      case 'Inactive':
        return <Badge className="bg-gray-100 text-gray-800 font-medium">Inactive</Badge>
      case 'Follow-up Due':
        return <Badge className="bg-yellow-100 text-yellow-800 font-medium">Follow-up Due</Badge>
      case 'Archived':
        return <Badge className="bg-red-100 text-red-800 font-medium">Archived</Badge>
      default:
        return <Badge className="bg-green-100 text-green-800 font-medium">{status}</Badge>
    }
  }

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project ? project.name : 'Unknown Project'
  }

  const getProgramName = (programId: string) => {
    const program = programs.find(p => p.id === programId)
    return program ? program.name : 'Unknown Program'
  }

  return (
    <ProtectedRoute>
      <RoleBasedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Beneficiary Management</h1>
              <p className="text-muted-foreground">Track individuals and families served by the foundation</p>
            </div>
            {canManageBeneficiaries && (
              <Button className="font-medium shadow-md cursor-pointer" onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Beneficiary
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Beneficiaries</p>
                    <p className="text-2xl font-bold text-foreground">{totalCount}</p>
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
                    <p className="text-2xl font-bold text-foreground">
                      {beneficiaries.filter(b => b.status === 'Active' && b.programIds && b.programIds.length > 0).length}
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
                    <p className="text-sm font-medium text-muted-foreground">Communities Reached</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Array.from(new Set(beneficiaries.map(b => b.community))).length}
                    </p>
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
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search beneficiaries..."
                      className="pl-10 flex-1"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1) // Reset to first page when search changes
                      }}
                    />
                  </div>
                  <Select value={filterProgram} onValueChange={(value) => {
                    setFilterProgram(value)
                    setCurrentPage(1) // Reset to first page when filter changes
                  }}>
                    <SelectTrigger className="w-full md:w-48 font-medium border-border cursor-pointer">
                      <SelectValue placeholder="Filter by program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : beneficiaries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm || filterProgram !== 'all' 
                      ? 'No beneficiaries found matching your search criteria.' 
                      : 'No beneficiaries found. Create your first beneficiary.'}
                  </div>
                ) : (
                  <>
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
                        {beneficiaries.map((beneficiary) => (
                          <TableRow key={beneficiary.id}>
                            <TableCell className="font-medium text-foreground">{beneficiary.name}</TableCell>
                            <TableCell className="text-muted-foreground">{beneficiary.age}</TableCell>
                            <TableCell className="text-muted-foreground">{beneficiary.gender}</TableCell>
                            <TableCell className="text-muted-foreground">{beneficiary.community}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {beneficiary.programIds && beneficiary.programIds.length > 0 ? (
                                  beneficiary.programIds.slice(0, 2).map((programId) => {
                                    const program = programs.find(p => p.id === programId)
                                    return program ? (
                                      <Badge key={programId} variant="secondary" className="text-secondary-foreground font-medium">
                                        {program.name}
                                      </Badge>
                                    ) : (
                                      <Badge key={programId} variant="secondary" className="text-secondary-foreground font-medium">
                                        Unknown Program
                                      </Badge>
                                    )
                                  })
                                ) : (
                                  <span className="text-muted-foreground text-sm">No programs</span>
                                )}
                                {beneficiary.programIds && beneficiary.programIds.length > 2 && (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    +{beneficiary.programIds.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(beneficiary.status)}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openViewDialog(beneficiary)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {canManageBeneficiaries && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(beneficiary)}
                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                {canDeleteBeneficiaries && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(beneficiary)}
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
                          Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} beneficiaries
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

      {/* Create Beneficiary Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Beneficiary</DialogTitle>
            <DialogDescription>
              Add a new beneficiary to the system
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBeneficiary}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter age"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={gender} onValueChange={setGender} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="community">Community *</Label>
                <Input
                  id="community"
                  value={community}
                  onChange={(e) => setCommunity(e.target.value)}
                  placeholder="Enter community"
                  required
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProjectIds(selectedProjectIds.filter(id => id !== projectId));
                          }}
                        >
                          <XIcon className="h-3 w-3" />
                        </span>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="programs">Associated Programs (Optional)</Label>
                <Select onValueChange={(value) => {
                  if (value && !selectedProgramIds.includes(value)) {
                    setSelectedProgramIds([...selectedProgramIds, value]);
                  }
                }}>
                  <SelectTrigger className='cursor-pointer'>
                    <SelectValue placeholder="Select programs" />
                  </SelectTrigger>
                  <SelectContent className='cursor-pointer'>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedProgramIds.map((programId) => {
                    const program = programs.find(p => p.id === programId);
                    return program ? (
                      <Badge key={programId} variant="secondary" className="mr-1">
                        {program.name}
                        <span
                          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProgramIds(selectedProgramIds.filter(id => id !== programId));
                          }}
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter beneficiary description"
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
                Create Beneficiary
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Beneficiary Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Beneficiary Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedBeneficiary?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedBeneficiary && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                  <p className="font-medium">{selectedBeneficiary.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Age</h3>
                  <p>{selectedBeneficiary.age}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Gender</h3>
                  <p>{selectedBeneficiary.gender}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Community</h3>
                  <p>{selectedBeneficiary.community}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                  <p>{selectedBeneficiary.phone || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{selectedBeneficiary.email || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <p>{selectedBeneficiary.status}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Associated Projects</h3>
                  <div className="mt-1">
                    {selectedBeneficiary.projectIds && selectedBeneficiary.projectIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedBeneficiary.projectIds.map((projectId) => {
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
                  <h3 className="text-sm font-medium text-muted-foreground">Associated Programs</h3>
                  <div className="mt-1">
                    {selectedBeneficiary.programIds && selectedBeneficiary.programIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedBeneficiary.programIds.map((programId) => {
                          const program = programs.find(p => p.id === programId)
                          return program ? (
                            <Badge key={programId} variant="secondary">
                              {program.name}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No programs associated</p>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                  <p>{selectedBeneficiary.address || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p>{selectedBeneficiary.description || 'N/A'}</p>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Created By</h3>
                    <p>{selectedBeneficiary.createdBy || 'Unknown User'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Creation Date</h3>
                    <p>{selectedBeneficiary.createdAt?.toLocaleDateString('en-US', { 
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

      {/* Edit Beneficiary Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Beneficiary</DialogTitle>
            <DialogDescription>
              Update information for {selectedBeneficiary?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedBeneficiary && (
            <form onSubmit={handleUpdateBeneficiary}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name *</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-age">Age *</Label>
                  <Input
                    id="edit-age"
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter age"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-gender">Gender *</Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-community">Community *</Label>
                  <Input
                    id="edit-community"
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                    placeholder="Enter community"
                    required
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProjectIds(selectedProjectIds.filter(id => id !== projectId));
                            }}
                          >
                            <XIcon className="h-3 w-3" />
                          </span>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-programs">Associated Programs (Optional)</Label>
                  <Select onValueChange={(value) => {
                    if (value && !selectedProgramIds.includes(value)) {
                      setSelectedProgramIds([...selectedProgramIds, value]);
                    }
                  }}>
                    <SelectTrigger className='cursor-pointer'>
                      <SelectValue placeholder="Select programs" />
                    </SelectTrigger>
                    <SelectContent className='cursor-pointer'>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedProgramIds.map((programId) => {
                      const program = programs.find(p => p.id === programId);
                      return program ? (
                        <Badge key={programId} variant="secondary" className="mr-1">
                          {program.name}
                          <span
                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProgramIds(selectedProgramIds.filter(id => id !== programId));
                            }}
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
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter beneficiary description"
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
                  Update Beneficiary
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Beneficiary Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Beneficiary</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedBeneficiary?.name}</span>? 
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
              onClick={handleDeleteBeneficiary}
              disabled={isDeleting}
              className="w-auto cursor-pointer"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Beneficiary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}