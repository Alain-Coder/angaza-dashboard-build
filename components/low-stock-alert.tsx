'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle } from "lucide-react"
import { getLowStockResources, getOutOfStockResources } from '@/lib/resource-utils'
import { toast } from 'sonner'

interface Resource {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  description: string
}

export function LowStockAlert() {
  const [lowStockResources, setLowStockResources] = useState<Resource[]>([])
  const [outOfStockResources, setOutOfStockResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const [lowStock, outOfStock] = await Promise.all([
          getLowStockResources(7),
          getOutOfStockResources()
        ])
        
        setLowStockResources(lowStock)
        setOutOfStockResources(outOfStock)
      } catch (error) {
        console.error('Error fetching stock data:', error)
        toast.error('Failed to load stock alerts', {
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStockData()
  }, [])

  if (loading) {
    return null // Don't show anything while loading
  }

  const hasAlerts = lowStockResources.length > 0 || outOfStockResources.length > 0

  if (!hasAlerts) {
    return null // Don't show anything if no alerts
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Stock Alerts
        </CardTitle>
        <CardDescription>Resources that need attention</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {outOfStockResources.length > 0 && (
          <div>
            <h4 className="font-medium text-destructive mb-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Out of Stock
            </h4>
            <div className="space-y-2">
              {outOfStockResources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded border border-destructive/20">
                  <span className="font-medium">{resource.name}</span>
                  <Badge variant="destructive">Out of Stock</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {lowStockResources.length > 0 && (
          <div>
            <h4 className="font-medium text-yellow-600 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </h4>
            <div className="space-y-2">
              {lowStockResources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                  <span className="font-medium">{resource.name}</span>
                  <Badge className="bg-yellow-500 text-yellow-900 hover:bg-yellow-500">
                    {resource.quantity} {resource.unit} left
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}