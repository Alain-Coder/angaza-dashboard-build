'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Department {
  id: string
  name: string
  description?: string
}

export default function DepartmentManagementContent() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<{id: string, name: string} | null>(null)
  
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const q = query(collection(db, 'departments'), orderBy('name'))
      const querySnapshot = await getDocs(q)
      const departmentsData: Department[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        departmentsData.push({
          id: doc.id,
          name: data.name,
          description: data.description
        })
      })
      setDepartments(departmentsData)
    } catch (error: any) {
      console.error('Error fetching departments:', error)
      toast.error('Failed to fetch departments. Please try again later.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name) {
      toast.error('Please fill in all required fields', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, 'departments'), {
        name,
        code,
        description,
        createdAt: new Date()
      })

      toast.success('Department created successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      // Reset form and close dialog
      resetForm()
      setShowDialog(false)
      
      // Refresh department list
      fetchDepartments()
    } catch (error: any) {
      console.error('Error creating department:', error)
      toast.error(error.message || 'Failed to create department', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteDialog = (departmentId: string, departmentName: string) => {
    setDepartmentToDelete({id: departmentId, name: departmentName})
    setDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setDepartmentToDelete(null)
  }

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return
    
    try {
      setIsDeleting(true)
      await deleteDoc(doc(db, 'departments', departmentToDelete.id))
      
      toast.success('Department deleted successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      closeDeleteDialog()
      fetchDepartments() // Refresh the department list
    } catch (error: any) {
      console.error('Error deleting department:', error)
      toast.error(error.message || 'Failed to delete department', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const openCreateDialog = () => {
    resetForm()
    setShowDialog(true)
  }

  const resetForm = () => {
    setName('')
    setCode('')
    setDescription('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Departments</h3>
          <p className="text-muted-foreground">Manage organization departments</p>
        </div>
        <Button className="font-medium shadow-md cursor-pointer" onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Department
        </Button>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">Departments</CardTitle>
          <CardDescription>Manage organization departments</CardDescription>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No departments found. Create your first department.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id}>
                    <TableCell className="text-foreground">{department.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {department.description || 'No description'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(department.id, department.name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDepartment}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter department name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="Enter department description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className='cursor-pointer hover:text-foreground' disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className='cursor-pointer' disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{departmentToDelete?.name}</span>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} className='cursor-pointer hover:text-foreground' disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDepartment} className='cursor-pointer' disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}