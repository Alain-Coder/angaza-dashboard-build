'use client'

import { useState, useEffect, useMemo } from 'react'
import { ProtectedRoute } from "@/components/auth/protected-route"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { FolderOpen, Eye, Plus, Edit, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  budget: number
  startDate: Date
  endDate: Date
  progress: number
  staffCount: number
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'at-risk'
  createdAt: Date
  updatedAt: Date
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [viewingProject, setViewingProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    status: 'planning' as 'planning' | 'active' | 'completed' | 'on-hold',
    budget: '',
    startDate: '',
    endDate: ''
  })
  const [searchTerm, setSearchTerm] = useState('')

  // Check if user has permission to manage projects
  const canManageProjects = user?.role === 'executive director' || user?.role === 'finance lead' || user?.role === 'programs lead'

  // Fetch projects and programs from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects
        const projectsQuery = query(
          collection(db, 'projects'),
          orderBy('createdAt', 'desc')
        )

        const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
          const projectsData = snapshot.docs.map(doc => {
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
          setLoading(false)
        })

        // Fetch programs
        const programsQuery = query(
          collection(db, 'programs'),
          orderBy('createdAt', 'desc')
        )

        const unsubscribePrograms = onSnapshot(programsQuery, (snapshot) => {
          const programsData = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              startDate: data.startDate?.toDate() || new Date(),
              endDate: data.endDate?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as Program
          })
          setPrograms(programsData)
        })

        return () => {
          unsubscribeProjects()
          unsubscribePrograms()
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [projects, searchTerm])

  const getProjectPrograms = (projectId: string) => {
    return programs.filter(program => program.projectId === projectId)
  }

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
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const calculateProgress = (project: Project) => {
    if (project.budget <= 0) return 0
    return Math.min(100, Math.round((project.spent / project.budget) * 100))
  }

  const handleCreateProject = async () => {
    if (!canManageProjects) {
      toast.error('You do not have permission to create projects', {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      return
    }

    try {
      await addDoc(collection(db, 'projects'), {
        name: projectForm.name,
        description: projectForm.description,
        status: projectForm.status,
        budget: parseFloat(projectForm.budget) || 0,
        spent: 0,
        startDate: projectForm.startDate ? Timestamp.fromDate(new Date(projectForm.startDate)) : Timestamp.now(),
        endDate: projectForm.endDate ? Timestamp.fromDate(new Date(projectForm.endDate)) : Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      toast.success('Project created successfully', {
        style: {
          backgroundColor: '#dcfce7',
          color: '#14532d',
          border: '1px solid #bbf7d0'
        }
      })
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project', {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    }
  }

  const handleUpdateProject = async () => {
    if (!canManageProjects || !editingProject) {
      toast.error('You do not have permission to update projects', {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      return
    }

    try {
      const projectRef = doc(db, 'projects', editingProject.id)
      await updateDoc(projectRef, {
        name: projectForm.name,
        description: projectForm.description,
        status: projectForm.status,
        budget: parseFloat(projectForm.budget) || 0,
        startDate: projectForm.startDate ? Timestamp.fromDate(new Date(projectForm.startDate)) : Timestamp.now(),
        endDate: projectForm.endDate ? Timestamp.fromDate(new Date(projectForm.endDate)) : Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      toast.success('Project updated successfully', {
        style: {
          backgroundColor: '#dcfce7',
          color: '#14532d',
          border: '1px solid #bbf7d0'
        }
      })
      resetForm()
      setIsDialogOpen(false)
      setEditingProject(null)
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error('Failed to update project')
    }
  }

  const openDeleteDialog = (projectId: string) => {
    if (!canManageProjects) {
      toast.error('You do not have permission to delete projects', {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      return
    }
    setProjectToDelete(projectId)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteProject = async () => {
    if (!canManageProjects || !projectToDelete) {
      toast.error('You do not have permission to delete projects', {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      return
    }

    try {
      await deleteDoc(doc(db, 'projects', projectToDelete))
      toast.success('Project deleted successfully', {
        style: {
          backgroundColor: '#dcfce7',
          color: '#14532d',
          border: '1px solid #bbf7d0'
        }
      })
      setIsDeleteDialogOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project', {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      setIsDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  const resetForm = () => {
    setProjectForm({
      name: '',
      description: '',
      status: 'planning',
      budget: '',
      startDate: '',
      endDate: ''
    })
  }

  const openCreateDialog = () => {
    if (!canManageProjects) {
      toast.error('You do not have permission to create projects', {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      return
    }
    resetForm()
    setEditingProject(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (project: Project) => {
    if (!canManageProjects) {
      toast.error('You do not have permission to edit projects', {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      return
    }
    setProjectForm({
      name: project.name,
      description: project.description,
      status: project.status,
      budget: project.budget.toString(),
      startDate: project.startDate.toISOString().split('T')[0],
      endDate: project.endDate.toISOString().split('T')[0]
    })
    setEditingProject(project)
    setIsDialogOpen(true)
  }

  const openViewDialog = (project: Project) => {
    setViewingProject(project)
    setIsViewDialogOpen(true)
  }

  const handleSubmit = () => {
    if (editingProject) {
      handleUpdateProject()
    } else {
      handleCreateProject()
    }
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
              <h1 className="text-3xl font-bold text-foreground">Project Management</h1>
              <p className="text-muted-foreground">Track and manage all foundation projects</p>
            </div>
            {canManageProjects && (
              <Button onClick={openCreateDialog} className="font-medium shadow-md cursor-pointer">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            )}
          </div>

          {/* Search Bar for Projects */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search projects..."
              className="pl-10 py-2 w-full md:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredProjects.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No projects found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No projects match your search criteria.' : 'Get started by creating a new project.'}
                </p>
                {canManageProjects && !searchTerm && (
                  <Button onClick={openCreateDialog} className='cursor-pointer'>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center min-w-[80px]">
                        {getStatusBadge(project.status)}
                      </div>
                      <div className="flex space-x-1">
                        {canManageProjects && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => openDeleteDialog(project.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        {/* View button is always visible for all users */}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => openViewDialog(project)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {project.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1 font-medium">
                          <span>Progress</span>
                          <span>{calculateProgress(project)}%</span>
                        </div>
                        <Progress value={calculateProgress(project)} className="h-2 bg-muted/50" />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Budget</span>
                        <span className="font-medium text-foreground">
                          K{project.spent.toLocaleString()} / K{project.budget.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {project.status === 'completed' ? 'Completed' : 'Timeline'}
                        </span>
                        <span className="font-medium text-foreground">
                          {project.endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Project Form Dialog - Always rendered but only functional for users with management permissions */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingProject(null)
            resetForm()
          }
        }}>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
              <DialogDescription>
                {editingProject ? 'Update project details' : 'Add a new project to the system'}
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
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    placeholder="Enter project name"
                    required
                    disabled={!canManageProjects}
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
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    placeholder="Enter project description"
                    required
                    disabled={!canManageProjects}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <div className="col-span-3">
                  <Select 
                    value={projectForm.status} 
                    onValueChange={(value: any) => setProjectForm({...projectForm, status: value})}
                    disabled={!canManageProjects}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
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
                    value={projectForm.budget}
                    onChange={(e) => setProjectForm({...projectForm, budget: e.target.value})}
                    placeholder="Enter budget amount"
                    required
                    disabled={!canManageProjects}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
                  Start Date
                </Label>
                <div className="col-span-3">
                  <Input
                    id="startDate"
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({...projectForm, startDate: e.target.value})}
                    disabled={!canManageProjects}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  End Date
                </Label>
                <div className="col-span-3">
                  <Input
                    id="endDate"
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm({...projectForm, endDate: e.target.value})}
                    disabled={!canManageProjects}
                    className="w-full"
                  />
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
              {canManageProjects && (
                <Button 
                  onClick={handleSubmit}
                  className='cursor-pointer'
                >
                  {editingProject ? 'Update Project' : 'Create Project'}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Project View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingProject?.name}</DialogTitle>
              <DialogDescription>
                Project details and related programs
              </DialogDescription>
            </DialogHeader>
            {viewingProject && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <h3 className="text-lg font-semibold mb-2">Project Information</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="text-foreground">{viewingProject.description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <div className="mt-1">
                          {getStatusBadge(viewingProject.status)}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Timeline</p>
                        <p className="text-foreground">
                          {viewingProject.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - 
                          {viewingProject.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Budget Overview</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Budget Progress</p>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-muted/50 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                calculateProgress(viewingProject) < 30 ? 'bg-red-500' : 
                                calculateProgress(viewingProject) < 70 ? 'bg-yellow-500' : 'bg-green-500'
                              }`} 
                              style={{ width: `${calculateProgress(viewingProject)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-foreground">{calculateProgress(viewingProject)}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Budget</p>
                        <p className="text-foreground">MWK{viewingProject.budget.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Spent</p>
                        <p className="text-foreground">MWK{viewingProject.spent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Remaining</p>
                        <p className="text-foreground">MWK{(viewingProject.budget - viewingProject.spent).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Related Programs</h3>
                    <span className="text-sm text-muted-foreground">
                      {getProjectPrograms(viewingProject.id).length} programs
                    </span>
                  </div>
                  
                  {getProjectPrograms(viewingProject.id).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No programs found for this project</p>
                  ) : (
                    <div className="space-y-3">
                      {getProjectPrograms(viewingProject.id).map((program) => (
                        <div key={program.id} className="border border-border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-foreground">{program.name}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{program.description}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(program.status)}
                            </div>
                          </div>
                          
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Budget</p>
                              <p className="text-sm font-medium">MWK{program.budget.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Progress</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-full bg-muted/50 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full ${
                                      program.progress < 30 ? 'bg-red-500' : 
                                      program.progress < 70 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`} 
                                    style={{ width: `${program.progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-foreground">{program.progress}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Staff</p>
                              <p className="text-sm font-medium">{program.staffCount}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Timeline</p>
                              <p className="text-sm font-medium">
                                {program.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {canManageProjects && (
                  <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsViewDialogOpen(false)
                        openEditDialog(viewingProject)
                      }}
                      className='cursor-pointer'
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Project
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this project? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setProjectToDelete(null)
                }}
                className='cursor-pointer'
              >
                Cancel
              </Button>
              <Button 
                className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
                onClick={handleDeleteProject}
              >
                Delete Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </RoleBasedLayout>
    </ProtectedRoute>
  )
}