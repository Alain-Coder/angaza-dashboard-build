'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns';

interface Category {
  id: string
  name: string
  createdAt: Date | string | { toDate: () => Date } | { seconds: number; nanoseconds: number } | null | undefined
}

interface CategoryManagementProps {
  canPerformActions?: boolean;
}

export function CategoryManagement({ canPerformActions = true }: CategoryManagementProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  
  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{id: string, name: string} | null>(null)

  // Override the local canPerformActions check with the prop
  const canPerformActionsCheck = canPerformActions;

  // Helper function to safely convert createdAt to a Date object
  const convertToDate = (createdAt: Category['createdAt']): Date => {
    if (!createdAt) {
      return new Date();
    }
    
    if (createdAt instanceof Date) {
      return createdAt;
    }
    
    if (typeof createdAt === 'string') {
      const date = new Date(createdAt);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    if ('toDate' in createdAt) {
      // Handle Firestore Timestamp
      return createdAt.toDate();
    }
    
    if ('seconds' in createdAt && 'nanoseconds' in createdAt) {
      // Handle Firestore Timestamp object
      const date = new Date(createdAt.seconds * 1000 + Math.floor(createdAt.nanoseconds / 1000000));
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    // Fallback
    const date = new Date(createdAt as any);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        
        if (data.categories) {
          const categoriesData: Category[] = data.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            createdAt: cat.createdAt
          }));
          
          // Sort alphabetically
          categoriesData.sort((a, b) => a.name.localeCompare(b.name));
          setCategories(categoriesData);
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error fetching categories:', error)
        toast.error('Failed to load categories', {
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }
        })
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Category name is required', {
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
      return
    }

    setIsAdding(true)
    
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory.trim() })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        const newCategoryObj: Category = {
          id: data.id,
          name: data.name,
          createdAt: data.createdAt
        };
        
        setCategories([...categories, newCategoryObj].sort((a, b) => a.name.localeCompare(b.name)));
        setNewCategory('');
        
        toast.success('Category added successfully', {
          style: {
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0'
          }
        })
      } else {
        toast.error(data.error || 'Failed to add category', {
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }
        })
      }
    } catch (error) {
      console.error('Error adding category:', error)
      toast.error('Failed to add category', {
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    setCategoryToDelete({id, name})
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteCategory = async () => {
  if (!categoryToDelete) return
  
  try {
    console.log('=== Deleting Category ===')
    console.log('Category ID:', categoryToDelete.id)
    console.log('Category Name:', categoryToDelete.name)
    
    const deleteUrl = `/api/categories/${categoryToDelete.id}`
    console.log('Delete URL:', deleteUrl)
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE'
    })
    
    console.log('Delete response status:', response.status)
    console.log('Delete response ok:', response.ok)
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const errorText = await response.text()
      console.error('Non-JSON response received:', errorText.substring(0, 200))
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Delete response data:', data)
    
    if (response.ok) {
      setCategories(categories.filter(c => c.id !== categoryToDelete.id))
      toast.success('Category deleted successfully', {
        style: {
          background: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
    } else {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error: any) {
    console.error('Error deleting category:', error)
    toast.error(error.message || 'Failed to delete category', {
      style: {
        background: '#fee2e2',
        color: '#991b1b',
        border: '1px solid #fecaca'
      }
    })
  } finally {
    setIsDeleteDialogOpen(false)
    setCategoryToDelete(null)
  }
}

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Category Management</CardTitle>
          <CardDescription>Manage resource categories</CardDescription>
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
        <CardTitle>Category Management</CardTitle>
        <CardDescription>Manage resource categories</CardDescription>
      </CardHeader>
      <CardContent>
        {canPerformActionsCheck && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Label htmlFor="new-category" className="sr-only">New Category</Label>
                <Input
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCategory()
                    }
                  }}
                />
              </div>
              <Button 
                onClick={handleAddCategory} 
                disabled={isAdding || !newCategory.trim()}
                className="w-full sm:w-auto cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        )}
        
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No categories found</p>
            {canPerformActionsCheck && (
              <p className="text-sm text-muted-foreground mt-2">
                Add your first category using the form above
              </p>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Created At</TableHead>
                  {canPerformActionsCheck && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      {format(convertToDate(category.createdAt), 'yyyy MMM d')}
                    </TableCell>
                    {canPerformActionsCheck && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className='cursor-pointer'
                          disabled={categories.length <= 1} // Prevent deleting all categories
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the category "{categoryToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteCategory}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}