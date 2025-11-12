'use client'

import { useState, useEffect, useMemo } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { Layers, FolderOpen, DollarSign, Users, TrendingUp, Plus, Eye, Edit, Trash2, Banknote, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, getDocs, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

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

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function ProgramsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null)
  const [viewingProgram, setViewingProgram] = useState<Program | null>(null)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [programForm, setProgramForm] = useState({
    name: '',
    description: '',
    projectId: '',
    budget: '',
    startDate: '',
    endDate: '',
    progress: '0',
    assignedUsers: [] as string[],
    status: 'planning' as 'planning' | 'active' | 'completed' | 'on-hold' | 'at-risk'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const programsPerPage = 10

  // Check if user has permission to manage programs
  const canManagePrograms = user?.role === 'executive director' || user?.role === 'finance lead' || user?.role === 'programs lead'

  // Fetch projects, programs, and users from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all users and filter out system admins locally
        const usersQuery = query(collection(db, 'users'))
        const usersSnapshot = await getDocs(usersQuery)
        const usersData = usersSnapshot.docs
          .map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              name: data.name || 'Unknown User',
              email: data.email || '',
              role: data.role || 'No Role'
            } as User
          })
          .filter(user => user.role !== 'system admin') // Filter out system admins locally
        setUsers(usersData)
        
        // Fetch projects
        const projectsQuery = query(
          collection(db, 'projects'),
          orderBy('createdAt', 'desc')
        )
        
        const projectsSnapshot = await getDocs(projectsQuery)
        const projectsData = projectsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Project
        })
        setProjects(projectsData)
        
        // Fetch programs
        const programsQuery = query(
          collection(db, 'programs'),
          orderBy('createdAt', 'desc')
        )
        
        const unsubscribe = onSnapshot(programsQuery, (snapshot) => {
          const programsData = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              startDate: data.startDate?.toDate() || new Date(),
              endDate: data.endDate?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              assignedUsers: data.assignedUsers || [],
              progress: data.progress || 0
            } as Program
          })
          setPrograms(programsData)
          setLoading(false)
        })
        
        return () => unsubscribe()
      } catch (error) {
        console.error('Error fetching data:', error)
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Filter programs based on search term and status
  const filteredPrograms = useMemo(() => {
    let result = programs
    
    // Filter by search term
    if (searchTerm) {
      result = result.filter(program => 
        program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        program.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (program.projectName && program.projectName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(program => program.status === statusFilter)
    }
    
    return result
  }, [programs, searchTerm, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredPrograms.length / programsPerPage)
  const paginatedPrograms = useMemo(() => {
    const startIndex = (currentPage - 1) * programsPerPage
    return filteredPrograms.slice(startIndex, startIndex + programsPerPage)
  }, [filteredPrograms, currentPage])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <Badge variant="outline" className="text-muted-foreground">Planning</Badge>
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 font-medium">Active</Badge>
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 font-medium">Completed</Badge>
      case 'on-hold':
        return <Badge className="bg-red-100 text-red-800 font-medium">On Hold</Badge>
      case 'at-risk':
        return <Badge className="bg-yellow-100 text-yellow-800 font-medium">At Risk</Badge>
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>
    }
  }

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project ? project.name : 'Unknown Project'
  }

  const getRemainingBudget = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return 0
    return project.budget - project.spent
  }

  const calculateProjectSpent = (projectId: string) => {
    const projectPrograms = programs.filter(p => p.projectId === projectId)
    return projectPrograms.reduce((total, program) => total + program.budget, 0)
  }

  const handleCreateProgram = async () => {
    if (!canManagePrograms) {
      toast.error('You do not have permission to create programs', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    if (!programForm.projectId) {
      toast.error('Please select a project', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    const selectedProject = projects.find(p => p.id === programForm.projectId)
    if (!selectedProject) {
      toast.error('Selected project not found', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    const programBudget = parseFloat(programForm.budget) || 0
    const remainingBudget = selectedProject.budget - selectedProject.spent
    const totalProgramsBudget = calculateProjectSpent(selectedProject.id) + programBudget

    // Check if program budget exceeds remaining project budget
    if (programBudget > remainingBudget) {
      toast.error(`Program budget (MWK${programBudget.toLocaleString()}) exceeds remaining project budget (MWK${remainingBudget.toLocaleString()})`, {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      // Create the program with manual progress
      await addDoc(collection(db, 'programs'), {
        name: programForm.name,
        description: programForm.description,
        projectId: programForm.projectId,
        projectName: selectedProject.name,
        budget: programBudget,
        startDate: programForm.startDate ? Timestamp.fromDate(new Date(programForm.startDate)) : Timestamp.now(),
        endDate: programForm.endDate ? Timestamp.fromDate(new Date(programForm.endDate)) : Timestamp.now(),
        progress: parseInt(programForm.progress) || 0, // Manual progress input
        staffCount: programForm.assignedUsers.length,
        assignedUsers: programForm.assignedUsers,
        status: programForm.status,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      // Update project spent amount
      const projectRef = doc(db, 'projects', selectedProject.id)
      await updateDoc(projectRef, {
        spent: totalProgramsBudget,
        updatedAt: Timestamp.now()
      })

      toast.success('Program created successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error creating program:', error)
      toast.error('Failed to create program', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleUpdateProgram = async () => {
    if (!canManagePrograms || !editingProgram) {
      toast.error('You do not have permission to update programs', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    const selectedProject = projects.find(p => p.id === programForm.projectId)
    if (!selectedProject) {
      toast.error('Selected project not found', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    const programBudget = parseFloat(programForm.budget) || 0
    const remainingBudget = selectedProject.budget - selectedProject.spent
    
    // Calculate total budget of all programs for this project excluding the current program being edited
    const otherProgramsBudget = programs
      .filter(p => p.projectId === selectedProject.id && p.id !== editingProgram.id)
      .reduce((total, program) => total + program.budget, 0)
    
    const totalProgramsBudget = otherProgramsBudget + programBudget

    // Check if program budget exceeds remaining project budget
    if (programBudget > remainingBudget) {
      toast.error(`Program budget (MWK${programBudget.toLocaleString()}) exceeds remaining project budget (MWK${remainingBudget.toLocaleString()})`, {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      const programRef = doc(db, 'programs', editingProgram.id)
      await updateDoc(programRef, {
        name: programForm.name,
        description: programForm.description,
        projectId: programForm.projectId,
        budget: programBudget,
        startDate: programForm.startDate ? Timestamp.fromDate(new Date(programForm.startDate)) : Timestamp.now(),
        endDate: programForm.endDate ? Timestamp.fromDate(new Date(programForm.endDate)) : Timestamp.now(),
        progress: parseInt(programForm.progress) || 0, // Manual progress input
        staffCount: programForm.assignedUsers.length,
        assignedUsers: programForm.assignedUsers,
        status: programForm.status,
        updatedAt: Timestamp.now()
      })

      // Update project spent amount
      const projectRef = doc(db, 'projects', selectedProject.id)
      await updateDoc(projectRef, {
        spent: totalProgramsBudget,
        updatedAt: Timestamp.now()
      })

      toast.success('Program updated successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      resetForm()
      setIsDialogOpen(false)
      setEditingProgram(null)
    } catch (error) {
      console.error('Error updating program:', error)
      toast.error('Failed to update program', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const openDeleteDialog = (program: Program) => {
    if (!canManagePrograms) {
      toast.error('You do not have permission to delete programs', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    setProgramToDelete(program)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteProgram = async () => {
    if (!canManagePrograms || !programToDelete) {
      toast.error('You do not have permission to delete programs', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    try {
      // Get the project to update its budget
      const project = projects.find(p => p.id === programToDelete.projectId)
      if (project) {
        // Update project spent amount by subtracting the program's budget
        const projectRef = doc(db, 'projects', project.id)
        const newSpent = project.spent - programToDelete.budget
        await updateDoc(projectRef, {
          spent: Math.max(0, newSpent), // Ensure spent doesn't go negative
          updatedAt: Timestamp.now()
        })
      }

      // Delete the program
      await deleteDoc(doc(db, 'programs', programToDelete.id))
      
      toast.success('Program deleted successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      // Close the dialog and reset state
      setIsDeleteDialogOpen(false)
      setProgramToDelete(null)
    } catch (error) {
      console.error('Error deleting program:', error)
      toast.error('Failed to delete program', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const resetForm = () => {
    setProgramForm({
      name: '',
      description: '',
      projectId: '',
      budget: '',
      startDate: '',
      endDate: '',
      progress: '0',
      assignedUsers: [],
      status: 'planning' as 'planning' | 'active' | 'completed' | 'on-hold' | 'at-risk'
    })
  }

  const openCreateDialog = () => {
    if (!canManagePrograms) {
      toast.error('You do not have permission to create programs', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    resetForm()
    setEditingProgram(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (program: Program) => {
    if (!canManagePrograms) {
      toast.error('You do not have permission to edit programs', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }
    setProgramForm({
      name: program.name,
      description: program.description,
      projectId: program.projectId,
      budget: program.budget.toString(),
      startDate: program.startDate.toISOString().split('T')[0],
      endDate: program.endDate.toISOString().split('T')[0],
      progress: program.progress.toString(),
      assignedUsers: program.assignedUsers || [],
      status: program.status as 'planning' | 'active' | 'completed' | 'on-hold' | 'at-risk'
    })
    setEditingProgram(program)
    setIsDialogOpen(true)
  }

  const openViewDialog = (program: Program) => {
    setViewingProgram(program)
    setIsViewDialogOpen(true)
  }

  const handleSubmit = () => {
    if (editingProgram) {
      handleUpdateProgram()
    } else {
      handleCreateProgram()
    }
  }

  const getProjectPrograms = (projectId: string) => {
    return programs.filter(p => p.projectId === projectId).length
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <RoleBasedLayout>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <h1 className="text-3xl font-bold text-foreground">Program Portfolio Management</h1>
              <p className="text-muted-foreground">Track and manage multiple programs across communities</p>
            </div>
            {canManagePrograms && (
              <Button onClick={openCreateDialog} className="font-medium shadow-md cursor-pointer">
                <Plus className="w-4 h-4 mr-2" />
                New Program
              </Button>
            )}
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search programs..."
                className="pl-10 py-2 w-full"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1) // Reset to first page when searching
                }}
              />
            </div>
            
            <div className="w-full md:w-48">
              <Select 
                value={statusFilter} 
                onValueChange={(value) => {
                  setStatusFilter(value)
                  setCurrentPage(1) // Reset to first page when filtering
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="at-risk">At Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Programs</p>
                    <p className="text-2xl font-bold text-foreground">{programs.filter(p => p.status === 'active').length}</p>
                  </div>
                  <FolderOpen className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold text-foreground">
                      K{programs.reduce((total, program) => total + program.budget, 0).toLocaleString()}
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
                    <p className="text-sm font-medium text-muted-foreground">Staff Assigned</p>
                    <p className="text-2xl font-bold text-foreground">
                      {programs.reduce((total, program) => total + program.staffCount, 0)}
                    </p>
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
                    <p className="text-2xl font-bold text-foreground">
                      {programs.length > 0 
                        ? Math.round(programs.reduce((total, program) => total + program.progress, 0) / programs.length) 
                        : 0}%
                    </p>
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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Name</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Timeline</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPrograms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No programs match your search criteria.' : 'No programs found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPrograms.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell className="font-medium text-foreground">
                          {program.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {getProjectName(program.projectId)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {program.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                          {program.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          K{program.budget.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-muted/50 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  program.progress < 30 ? 'bg-red-500' : 
                                  program.progress < 70 ? 'bg-yellow-500' : 'bg-green-500'
                                }`} 
                                style={{ width: `${program.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-foreground">{program.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {program.staffCount}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getStatusBadge(program.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                              onClick={() => openViewDialog(program)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canManagePrograms && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-destructive hover:text-destructive cursor-pointer"
                                  onClick={() => openDeleteDialog(program)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border p-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * programsPerPage + 1, filteredPrograms.length)} to {Math.min(currentPage * programsPerPage, filteredPrograms.length)} of {filteredPrograms.length} programs
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className='cursor-pointer'
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

        {/* Program Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingProgram(null)
            resetForm()
          }
        }}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProgram ? 'Edit Program' : 'Create New Program'}</DialogTitle>
              <DialogDescription>
                {editingProgram ? 'Update program details' : 'Add a new program to the system'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name *
                </Label>
                <div className="col-span-3">
                  <Input
                    id="name"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({...programForm, name: e.target.value})}
                    placeholder="Enter program name"
                    required
                    disabled={!canManagePrograms}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description *
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="description"
                    value={programForm.description}
                    onChange={(e) => setProgramForm({...programForm, description: e.target.value})}
                    placeholder="Enter program description"
                    required
                    disabled={!canManagePrograms}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="projectId" className="text-right">
                  Project *
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={programForm.projectId} 
                    onValueChange={(value) => setProgramForm({...programForm, projectId: value})}
                    disabled={!canManagePrograms || !!editingProgram}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {programForm.projectId && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Remaining budget: MWK{getRemainingBudget(programForm.projectId).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="budget" className="text-right">
                  Budget *
                </Label>
                <div className="col-span-3">
                  <Input
                    id="budget"
                    type="number"
                    value={programForm.budget}
                    onChange={(e) => setProgramForm({...programForm, budget: e.target.value})}
                    placeholder="Enter budget amount"
                    required
                    disabled={!canManagePrograms}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="progress" className="text-right">
                  Progress (%)
                </Label>
                <div className="col-span-3">
                  <Input
                    id="progress"
                    type="number"
                    min="0"
                    max="100"
                    value={programForm.progress}
                    onChange={(e) => setProgramForm({...programForm, progress: e.target.value})}
                    disabled={!canManagePrograms}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignedUsers" className="text-right">
                  Staff
                </Label>
                <div className="col-span-3">
                  <div className={canManagePrograms ? '' : 'opacity-50 pointer-events-none'}>
                    <MultiSelect
                      options={users.map(user => ({
                        value: user.id,
                        label: user.name,
                        description: user.role
                      }))}
                      selected={programForm.assignedUsers}
                      onChange={(selected) => {
                        setProgramForm({...programForm, assignedUsers: selected});
                      }}
                      placeholder="Select staff members"
                    />
                  </div>
                  {/* Display the number of assigned staff members */}
                  <p className="text-sm text-muted-foreground mt-1">
                    {programForm.assignedUsers.length} staff member(s) assigned
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={programForm.status} 
                    onValueChange={(value: any) => setProgramForm({...programForm, status: value})}
                    disabled={!canManagePrograms}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="at-risk">At Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                className='cursor-pointer'
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              {canManagePrograms && (
                <Button
                  className='cursor-pointer'
                  onClick={handleSubmit}
                >
                  {editingProgram ? 'Update Program' : 'Create Program'}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Program View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
          setIsViewDialogOpen(open)
          if (!open) {
            setViewingProgram(null)
          }
        }}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingProgram?.name}</DialogTitle>
              <DialogDescription>
                Program details and related information
              </DialogDescription>
            </DialogHeader>
            {viewingProgram && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <h3 className="text-lg font-semibold mb-2">Program Information</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="text-foreground">{viewingProgram.description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Project</p>
                        <p className="text-foreground">{getProjectName(viewingProgram.projectId)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Timeline</p>
                        <p className="text-foreground">
                          {viewingProgram.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - 
                          {viewingProgram.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Budget</p>
                        <p className="text-foreground">K{viewingProgram.budget.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div className="mt-1">
                          {getStatusBadge(viewingProgram.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Metrics</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Progress</p>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                viewingProgram.progress < 30 ? 'bg-red-500' : 
                                viewingProgram.progress < 70 ? 'bg-yellow-500' : 'bg-green-500'
                              }`} 
                              style={{ width: `${viewingProgram.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-foreground">{viewingProgram.progress}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Staff Assigned</p>
                        <p className="text-foreground">{viewingProgram.staffCount}</p>
                        {viewingProgram.assignedUsers && viewingProgram.assignedUsers.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Assigned Staff:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              {viewingProgram.assignedUsers.map(userId => {
                                const user = users.find(u => u.id === userId);
                                return (
                                  <li key={userId} className="text-sm text-foreground flex items-start">
                                    <div className="w-2 h-2 rounded-full bg-primary mr-2 mt-2 flex-shrink-0"></div>
                                    <div>
                                      {user ? (
                                        <>
                                          <span>{user.name}</span>
                                          {user.role && (
                                            <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                                              {user.role}
                                            </span>
                                          )}
                                        </>
                                      ) : (
                                        <span>Unknown User</span>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Programs in Project</p>
                        <p className="text-foreground">{getProjectPrograms(viewingProgram.projectId)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4">
                  <h3 className="text-lg font-semibold mb-2">Project Information</h3>
                  {(() => {
                    const project = projects.find(p => p.id === viewingProgram.projectId)
                    if (!project) return <p className="text-muted-foreground">Project information not available</p>
                    
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Project Name</p>
                          <p className="text-foreground">{project.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Project Budget</p>
                          <p className="text-foreground">MWK{project.budget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Project Spent</p>
                          <p className="text-foreground">MWK{project.spent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Remaining Budget</p>
                          <p className="text-foreground">MWK{(project.budget - project.spent).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Project Status</p>
                          <div className="mt-1">
                            {getStatusBadge(project.status)}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Project Timeline</p>
                          <p className="text-foreground">
                            {project.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - 
                            {project.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
                
                {canManagePrograms && (
                  <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsViewDialogOpen(false)
                        openEditDialog(viewingProgram)
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Program
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setProgramToDelete(null)
          }
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the program "{programToDelete?.name}"? 
                This action cannot be undone and the budget will be returned to the project.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setProgramToDelete(null)
                }}
                className='cursor-pointer'
              >
                Cancel
              </Button>
              <Button 
                className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
                onClick={handleDeleteProgram}
              >
                Delete Program
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </RoleBasedLayout>
    </ProtectedRoute>
  )
}