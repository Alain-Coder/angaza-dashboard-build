'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from '@/lib/firebase'
import { collection, addDoc, updateDoc, doc, getDocs, query, where } from 'firebase/firestore'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface Resource {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  description: string
  value: number // Add value field
}

// Add Category interface
interface Category {
  id: string
  name: string
  createdAt: Date
}

interface DistributionFormProps {
  onClose: () => void
  onDistributionCreated: () => void
}

export function ResourceDistributionForm({ onClose, onDistributionCreated }: DistributionFormProps) {
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<Category[]>([]) // Add categories state
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    resourceId: '',
    resourceName: '',
    quantity: '',
    recipient: '',
    location: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedResourceValue, setSelectedResourceValue] = useState<number>(0)

  // Fetch available resources and categories
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

        // Fetch available resources
        const q = query(collection(db, 'resources'), where('quantity', '>', 0))
        const querySnapshot = await getDocs(q)
        const resourcesData: Resource[] = []
        
        querySnapshot.forEach((doc) => {
          resourcesData.push({
            id: doc.id,
            ...doc.data()
          } as Resource)
        })
        
        setResources(resourcesData)
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

  const handleResourceChange = (resourceId: string) => {
    const selectedResource = resources.find(r => r.id === resourceId)
    if (selectedResource) {
      setFormData({
        ...formData,
        resourceId,
        resourceName: selectedResource.name
      })
      setSelectedResourceValue(selectedResource.value || 0)
    }
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.resourceId) {
      newErrors.resourceId = 'Please select a resource'
    }
    
    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required'
    } else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid quantity'
    } else {
      const selectedResource = resources.find(r => r.id === formData.resourceId)
      if (selectedResource && Number(formData.quantity) > selectedResource.quantity) {
        newErrors.quantity = `Insufficient stock. Available: ${selectedResource.quantity}`
      }
    }
    
    if (!formData.recipient.trim()) {
      newErrors.recipient = 'Recipient is required'
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
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
      // Get the selected resource for value calculation
      const selectedResource = resources.find(r => r.id === formData.resourceId)
      const unitValue = selectedResource?.value || 0
      const totalValue = unitValue * Number(formData.quantity)
      
      // Create distribution record with pending status
      const distributionData = {
        resourceId: formData.resourceId,
        resourceName: formData.resourceName,
        quantity: Number(formData.quantity),
        unitValue: unitValue,
        totalValue: totalValue,
        recipient: formData.recipient,
        location: formData.location,
        notes: formData.notes,
        date: formData.date,
        status: 'pending', // Set initial status to pending
        createdAt: new Date()
      }
      
      await addDoc(collection(db, 'distributions'), distributionData)
      
      // Update resource stock
      if (selectedResource) {
        const updatedQuantity = selectedResource.quantity - Number(formData.quantity)
        await updateDoc(doc(db, 'resources', formData.resourceId), {
          quantity: updatedQuantity
        })
        
        // Show warning if stock is now zero
        if (updatedQuantity === 0) {
          toast.warning(`${selectedResource.name} is now out of stock!`, {
            style: {
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a'
            }
          })
        }
      }
      
      toast.success('Resource distribution created successfully', {
        style: {
          background: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
      onDistributionCreated()
      onClose()
    } catch (error) {
      console.error('Error creating distribution:', error)
      toast.error('Failed to create distribution', {
        style: {
          background: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    }
  }

  const calculateTotalValue = () => {
    if (formData.quantity && !isNaN(Number(formData.quantity))) {
      return selectedResourceValue * Number(formData.quantity)
    }
    return 0
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-h-[70vh] flex flex-col">
      <div className="flex-1 overflow-y-auto pr-2">
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="resource">Resource *</Label>
            <Select 
              value={formData.resourceId} 
              onValueChange={handleResourceChange}
              required
            >
              <SelectTrigger className={errors.resourceId ? 'border-destructive cursor-pointer' : ''}>
                <SelectValue placeholder="Select a resource" />
              </SelectTrigger>
              <SelectContent>
                {resources.map((resource) => (
                  <SelectItem key={resource.id} value={resource.id}>
                    {resource.name} ({resource.quantity} {resource.unit} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.resourceId && <p className="text-sm text-destructive">{errors.resourceId}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {formData.quantity && selectedResourceValue > 0 && (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>Value Information</AlertTitle>
              <AlertDescription>
                Unit value: K{selectedResourceValue.toFixed(2)} | 
                Total value: K{calculateTotalValue().toFixed(2)}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient *</Label>
            <Input
              id="recipient"
              name="recipient"
              value={formData.recipient}
              onChange={handleChange}
              className={errors.recipient ? 'border-destructive' : ''}
              placeholder="Enter recipient name"
            />
            {errors.recipient && <p className="text-sm text-destructive">{errors.recipient}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={errors.location ? 'border-destructive' : ''}
              placeholder="Enter distribution location"
            />
            {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about this distribution"
              rows={3}
            />
          </div>
        </form>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
        <Button type="button" className='cursor-pointer' variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className='cursor-pointer' onClick={(e) => {
          e.preventDefault()
          handleSubmit(e)
        }}>
          Distribute Resource
        </Button>
      </div>
    </div>
  )
}