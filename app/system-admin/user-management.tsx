'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  department?: string
}

interface Department {
  id: string
  name: string
  code: string
  description?: string
}

export default function UserManagementContent() {
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [department, setDepartment] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { user: currentUser } = useAuth()

  // Test toast notification
  useEffect(() => {
    // Simple test to verify toast is working
    // toast.success('Toast notifications are working!')
  }, [])

  useEffect(() => {
    fetchUsers()
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
          code: data.code,
          description: data.description
        })
      })
      setDepartments(departmentsData)
    } catch (error: any) {
      console.error('Error fetching departments:', error)
      toast.error('Failed to fetch departments.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'))
      const usersData: User[] = []
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        console.log('User data from Firestore:', doc.id, userData);
        usersData.push({ 
          id: doc.id, 
          name: userData.name || '',
          email: userData.email || '',
          role: userData.role || '',
          status: userData.status || 'Active',
          department: userData.department || ''
        } as User)
      })
      console.log('All users data:', usersData);
      setUsers(usersData)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      // Provide more user-friendly error messages
      if (error.code === 'permission-denied') {
        toast.error('Insufficient permissions to fetch users.', {
          style: { backgroundColor: '#fee2e2', color: '#991b1b' }
        })
      } else {
        toast.error('Failed to fetch users. Please try again later.', {
          style: { backgroundColor: '#fee2e2', color: '#991b1b' }
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !email || !password || !role) {
      toast.error('Please fill in all required fields', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    setIsSubmitting(true)
    try {
      console.log('Creating user with data:', { name, email, role, department });
      
      // Call our API route to create user server-side
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          department: department && department !== 'no-department' ? department : undefined
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      toast.success('User created successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      // Reset form and close dialog
      resetForm()
      setShowDialog(false)
      
      // Refresh user list
      fetchUsers()
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error(error.message || 'Failed to create user', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !email || !role || !editingUser) {
      toast.error('Please fill in all required fields', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Update user document in Firestore
      await updateDoc(doc(db, 'users', editingUser.id), {
        name,
        email,
        role,
        department: department && department !== 'no-department' ? department : null
      })

      toast.success('User updated successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      // Reset form and close dialog
      resetForm()
      setShowDialog(false)
      
      // Refresh user list
      fetchUsers()
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error(error.message || 'Failed to update user', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteDialog = (userId: string, userName: string) => {
    setUserToDelete({id: userId, name: userName})
    setDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setUserToDelete(null)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    try {
      // Prevent admin from deleting themselves
      if (userToDelete.id === currentUser?.uid) {
        toast.error('You cannot delete yourself', {
          style: { backgroundColor: '#fee2e2', color: '#991b1b' }
        })
        closeDeleteDialog()
        return
      }
      
      setIsDeleting(true)
      
      // Call our API route to delete user from both Firestore and Authentication
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userToDelete.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user')
      }

      toast.success('User deleted successfully from both Authentication and Firestore', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      closeDeleteDialog()
      fetchUsers() // Refresh the user list
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error(error.message || 'Failed to delete user from Authentication and Firestore', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const openCreateDialog = () => {
    setIsEditing(false)
    setEditingUser(null)
    resetForm()
    setShowDialog(true)
  }

  const openEditDialog = (user: User) => {
    setIsEditing(true)
    setEditingUser(user)
    setName(user.name)
    setEmail(user.email)
    setRole(user.role)
    setDepartment(user.department && user.department !== 'no-department' ? user.department : 'no-department')
    setPassword('') // Don't prefill password
    setShowDialog(true)
  }

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('')
    setDepartment('no-department')
    setEditingUser(null)
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
          <h3 className="text-2xl font-bold text-foreground">User Accounts</h3>
          <p className="text-muted-foreground">Manage existing user accounts</p>
        </div>
        <Button className="font-medium shadow-md cursor-pointer" onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground">User Accounts</CardTitle>
          <CardDescription>Manage existing user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.role && user.role !== 'undefined' ? user.role : 'No Role'}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.department && user.department !== 'no-department' ? (
                      <Badge variant="outline">
                        {departments.find(d => d.id === user.department)?.name || user.department}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">No Department</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={user.status === 'Active' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      className="text-blue-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {/* Prevent admin from deleting themselves */}
                    {user.id !== currentUser?.uid ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(user.id, user.name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">Current User</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit User' : 'Create New User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={isEditing ? handleUpdateUser : handleCreateUser}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@angazafoundation.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isEditing}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="board">Board</SelectItem>
                    <SelectItem value="executive director">Executive Director</SelectItem>
                    <SelectItem value="finance lead">Finance Lead</SelectItem>
                    <SelectItem value="programs lead">Programs Lead</SelectItem>
                    <SelectItem value="project officer">Project Officer</SelectItem>
                    <SelectItem value="office assistant">Office Assistant</SelectItem>
                    <SelectItem value="system admin">System Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-department">No Department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className='cursor-pointer' disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className='cursor-pointer' disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : isEditing ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{userToDelete?.name}</span>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDeleteDialog} className='cursor-pointer' disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} className='cursor-pointer' disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}