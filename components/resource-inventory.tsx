'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
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
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, query, where, orderBy, limit, startAfter } from 'firebase/firestore'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Search, Eye } from 'lucide-react'
import { RESOURCE_UNITS } from '@/lib/resource-constants'
import { useAuth } from '@/contexts/auth-context'

interface Resource {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  description: string
  value: number
  createdAt: Date
  updatedAt?: Date
  createdBy?: string
  updatedBy?: string
}

interface Category {
  id: string
  name: string
  createdAt: Date
}

const ITEMS_PER_PAGE = 10

interface ResourceInventoryProps {
  canPerformActions?: boolean;
}

export function ResourceInventory({ canPerformActions = true }: ResourceInventoryProps) {
  const [resources, setResources] = useState<Resource[]>([])
  const [filteredResources, setFilteredResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [viewingResource, setViewingResource] = useState<Resource | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: '',
    description: '',
    value: '',
    createdBy: '',
    updatedBy: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Get user from auth context
  const { user } = useAuth()
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  // Distribution form dialog
  const [isDistributionDialogOpen, setIsDistributionDialogOpen] = useState(false)

  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [resourceToDelete, setResourceToDelete] = useState<{id: string, name: string} | null>(null)

  // Fetch resources and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await fetch('/api/categories')
        const categoriesData = await categoriesResponse.json()
        
        if (categoriesData.categories) {
          const sortedCategories = categoriesData.categories
            .map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              createdAt: cat.createdAt?.toDate ? cat.createdAt.toDate() : new Date(cat.createdAt)
            }))
            .sort((a: Category, b: Category) => a.name.localeCompare(b.name))
            
          setCategories(sortedCategories)
        }

        // Fetch resources
        const querySnapshot = await getDocs(collection(db, 'resources'))
        const resourcesData: Resource[] = []
        
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          resourcesData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : undefined
          } as Resource)
        })
        
        // Sort by creation date (newest first)
        resourcesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        setResources(resourcesData)
        setFilteredResources(resourcesData)
        setTotalPages(Math.ceil(resourcesData.length / ITEMS_PER_PAGE))
        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data', {
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }
        })
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Apply filters and pagination
  useEffect(() => {
    let result = [...resources]
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(resource => 
        resource.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(resource => resource.category === selectedCategory)
    }
    
    // Update filtered resources and pagination
    setFilteredResources(result)
    setTotalPages(Math.ceil(result.length / ITEMS_PER_PAGE))
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchTerm, selectedCategory, resources])

  const handleAddNew = () => {
    setEditingResource(null)
    setFormData({
      name: '',
      category: '',
      quantity: '',
      unit: '',
      description: '',
      value: '',
      createdBy: '',
      updatedBy: ''
    })
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource)
    setFormData({
      name: resource.name,
      category: resource.category,
      quantity: resource.quantity.toString(),
      unit: resource.unit,
      description: resource.description,
      value: resource.value?.toString() || '',
      createdBy: resource.createdBy || '',
      updatedBy: resource.updatedBy || ''
    })
    setErrors({})
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    setResourceToDelete({id, name})
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteResource = async () => {
    if (!resourceToDelete) return
    
    try {
      await deleteDoc(doc(db, 'resources', resourceToDelete.id))
      setResources(resources.filter(r => r.id !== resourceToDelete.id))
      setFilteredResources(filteredResources.filter(r => r.id !== resourceToDelete.id))
      toast.success('Resource deleted successfully', {
        style: {
          background: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
    } catch (error) {
      console.error('Error deleting resource:', error)
      toast.error('Failed to delete resource', {
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setResourceToDelete(null)
    }
  }

  const handleView = (resource: Resource) => {
    setViewingResource(resource)
    setIsViewDialogOpen(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleCategoryChange = (value: string) => {
    setFormData({
      ...formData,
      category: value
    })
  }

  const handleUnitChange = (value: string) => {
    setFormData({
      ...formData,
      unit: value
    })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Resource name is required'
    }
    
    if (!formData.category) {
      newErrors.category = 'Category is required'
    }
    
    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required'
    } else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      newErrors.quantity = 'Please enter a valid quantity'
    }
    
    if (!formData.unit) {
      newErrors.unit = 'Unit is required'
    }
    
    if (formData.value && (isNaN(Number(formData.value)) || Number(formData.value) < 0)) {
      newErrors.value = 'Please enter a valid value'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      // Get category name from ID
      const selectedCategory = categories.find(c => c.id === formData.category)?.name || formData.category
      
      // Get current user info
      const currentUser = user?.displayName || user?.email || 'Unknown User'
      
      if (editingResource) {
        // Check if quantity is being reduced to zero
        const oldQuantity = editingResource.quantity
        const newQuantity = Number(formData.quantity)
        const isNowOutOfStock = newQuantity === 0 && oldQuantity > 0
        
        // Update existing resource
        await updateDoc(doc(db, 'resources', editingResource.id), {
          name: formData.name,
          category: selectedCategory,
          quantity: newQuantity,
          unit: formData.unit,
          description: formData.description,
          value: formData.value ? Number(formData.value) : 0,
          updatedBy: currentUser,
          updatedAt: new Date()
        })
        
        // Update in local state
        const updatedResources = resources.map(r => 
          r.id === editingResource.id 
            ? { 
                ...r, 
                name: formData.name,
                category: selectedCategory,
                quantity: newQuantity,
                unit: formData.unit,
                description: formData.description,
                value: formData.value ? Number(formData.value) : 0,
                updatedBy: currentUser,
                updatedAt: new Date()
              } 
            : r
        )
        
        setResources(updatedResources)
        setFilteredResources(updatedResources)
        
        if (isNowOutOfStock) {
          toast.warning(`${formData.name} is now out of stock!`, {
            style: {
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a'
            }
          })
        }
        
        toast.success('Resource updated successfully', {
          style: {
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0'
          }
        })
      } else {
        // Create new resource
        const newResource = {
          name: formData.name,
          category: selectedCategory,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          description: formData.description,
          value: formData.value ? Number(formData.value) : 0,
          createdBy: currentUser,
          createdAt: new Date(),
          updatedBy: currentUser,
          updatedAt: new Date()
        }
        
        const docRef = await addDoc(collection(db, 'resources'), newResource)
        
        // Add to local state
        const newResourceWithId = { ...newResource, id: docRef.id }
        setResources([newResourceWithId, ...resources])
        setFilteredResources([newResourceWithId, ...filteredResources])
        
        toast.success('Resource added successfully', {
          style: {
            background: '#dcfce7',
            color: '#166534',
            border: '1px solid #bbf7d0'
          }
        })
      }
      
      // Reset form and close dialog
      setIsDialogOpen(false)
      setEditingResource(null)
      setFormData({
        name: '',
        category: '',
        quantity: '',
        unit: '',
        description: '',
        value: '',
        createdBy: '',
        updatedBy: ''
      })
    } catch (error) {
      console.error('Error saving resource:', error)
      toast.error('Failed to save resource', {
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    }
  }

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

  // Get current page resources
  const getCurrentPageResources = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredResources.slice(startIndex, endIndex)
  }

  // Calculate total stock value for a resource
  const calculateTotalStockValue = (resource: Resource) => {
    return (resource.value || 0) * resource.quantity
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Resource Inventory</CardTitle>
          <CardDescription>Manage available resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Override the local canPerformActions check with the prop
  const canPerformActionsCheck = canPerformActions;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Resource Inventory</CardTitle>
            <CardDescription>Manage available resources</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {canPerformActionsCheck && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNew} className="w-full sm:w-auto cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                  <DialogHeader className="shrink-0">
                    <DialogTitle>
                      {editingResource ? 'Edit Resource' : 'Add New Resource'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto pr-2">
                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Resource Name *</Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={errors.name ? 'border-destructive' : ''}
                            placeholder="Enter resource name"
                          />
                          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>
                          
                        <div className="space-y-2">
                          <Label htmlFor="category">Category *</Label>
                          <Select 
                            value={formData.category} 
                            onValueChange={handleCategoryChange}
                          >
                            <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                        </div>
                      </div>
                        
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Quantity *</Label>
                          <Input
                            id="quantity"
                            name="quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={handleChange}
                            className={errors.quantity ? 'border-destructive' : ''}
                            placeholder="Enter quantity"
                          />
                          {errors.quantity && <p className="text-sm text-destructive">{errors.quantity}</p>}
                        </div>
                          
                        <div className="space-y-2">
                          <Label htmlFor="unit">Unit *</Label>
                          <Select 
                            value={formData.unit} 
                            onValueChange={handleUnitChange}
                          >
                            <SelectTrigger className={errors.unit ? 'border-destructive' : ''}>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {RESOURCE_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.unit && <p className="text-sm text-destructive">{errors.unit}</p>}
                        </div>
                          
                        <div className="space-y-2">
                          <Label htmlFor="value">Value (MWK)</Label>
                          <Input
                            id="value"
                            name="value"
                            type="number"
                            step="0.01"
                            value={formData.value}
                            onChange={handleChange}
                            className={errors.value ? 'border-destructive' : ''}
                            placeholder="Enter value"
                          />
                          {errors.value && <p className="text-sm text-destructive">{errors.value}</p>}
                        </div>
                      </div>
                        
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          placeholder="Enter resource description"
                          className="min-h-[100px]"
                        />
                      </div>
                        
                      <div className="flex justify-end space-x-2 pt-2">
                        <Button type="button" variant="outline" className='cursor-pointer' onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" className='cursor-pointer'>
                          {editingResource ? 'Update Resource' : 'Add Resource'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className='cursor-pointer'>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent className='cursor-pointer'>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
          
        {filteredResources.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No resources found</p>
            {canPerformActionsCheck && (
              <Button onClick={handleAddNew} className="mt-4">
                Add Your First Resource
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Resource</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Description</TableHead>
                    {canPerformActions && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getCurrentPageResources().map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">{resource.name}</TableCell>
                      <TableCell>{resource.category}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          resource.quantity === 0 
                            ? 'bg-red-100 text-red-800' 
                            : resource.quantity < 10 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {resource.quantity} {resource.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        {resource.value ? `K${resource.value.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>{resource.description || '-'}</TableCell>
                      {canPerformActionsCheck && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleView(resource)}
                              className="cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(resource)}
                              className="cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(resource.id, resource.name)}
                              className="cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
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
                  Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredResources.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredResources.length)} of {filteredResources.length} resources
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
                    className="cursor-pointer"
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
      
      {/* View Resource Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resource Details</DialogTitle>
          </DialogHeader>
          {viewingResource && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Resource Name</Label>
                  <p className="font-medium">{viewingResource.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                  <p className="font-medium">{viewingResource.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                  <p className="font-medium">{viewingResource.quantity} {viewingResource.unit}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Unit Value</Label>
                  <p className="font-medium">K{viewingResource.value?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Total Value</Label>
                  <p className="font-medium">K{calculateTotalStockValue(viewingResource).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge 
                    className={
                      viewingResource.quantity === 0 
                        ? 'bg-red-100 text-red-800' 
                        : viewingResource.quantity < 10 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                    }
                  >
                    {viewingResource.quantity === 0 
                      ? 'Out of Stock' 
                      : viewingResource.quantity < 10 
                        ? 'Low Stock' 
                        : 'In Stock'}
                  </Badge>
                </div>
                {viewingResource.createdBy && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                    <p className="font-medium">{viewingResource.createdBy}</p>
                  </div>
                )}
                {viewingResource.createdAt && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                    <p className="font-medium">
                      {viewingResource.createdAt instanceof Date 
                        ? viewingResource.createdAt.toLocaleString() 
                        : new Date(viewingResource.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {viewingResource.updatedBy && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Modified By</Label>
                    <p className="font-medium">{viewingResource.updatedBy}</p>
                  </div>
                )}
                {viewingResource.updatedAt && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Last Modified At</Label>
                    <p className="font-medium">
                      {viewingResource.updatedAt instanceof Date 
                        ? viewingResource.updatedAt.toLocaleString() 
                        : new Date(viewingResource.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <p className="mt-1">{viewingResource.description || 'No description provided'}</p>
              </div>
              <div className="flex justify-end">
                <Button className='cursor-pointer' onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the resource "{resourceToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className='cursor-pointer' onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className='cursor-pointer' onClick={confirmDeleteResource}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
