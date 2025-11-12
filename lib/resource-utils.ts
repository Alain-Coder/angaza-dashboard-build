import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore'

// Calculate distribution statistics
export async function getDistributionStats(categoryFilter?: string) {
  try {
    // Apply category filter if provided
    if (categoryFilter && categoryFilter !== 'all') {
      // First we need to get resources of this category to filter distributions
      const resourcesQuery = query(
        collection(db, 'resources'),
        where('category', '==', categoryFilter)
      )
      
      const resourcesSnapshot = await getDocs(resourcesQuery)
      const resourceIds = resourcesSnapshot.docs.map(doc => doc.id)
      
      if (resourceIds.length > 0) {
        // Filter distributions by resource IDs
        const distributionsQuery = query(
          collection(db, 'distributions'),
          where('resourceId', 'in', resourceIds)
        )
        
        const distributionsSnapshot = await getDocs(distributionsQuery)
        
        let totalDistributions = 0
        let valueDistributed = 0
        let quantitiesDistributed = 0 // Changed from recipients to quantities
        let pendingDistributions = 0
        
        distributionsSnapshot.forEach((doc) => {
          const data = doc.data()
          totalDistributions++
          
          if (data.status === 'pending') {
            pendingDistributions++
          }
          
          // Use actual total value from distribution
          if (data.totalValue && typeof data.totalValue === 'number') {
            valueDistributed += data.totalValue
          }
          
          // Count actual quantities distributed
          if (data.quantity && typeof data.quantity === 'number') {
            quantitiesDistributed += data.quantity
          }
        })
        
        return {
          totalDistributions,
          valueDistributed,
          recipients: quantitiesDistributed, // This now represents quantities distributed
          pendingDistributions
        }
      } else {
        // No resources in this category, return empty stats
        return {
          totalDistributions: 0,
          valueDistributed: 0,
          recipients: 0,
          pendingDistributions: 0
        }
      }
    }
    
    // No category filter, get all distributions
    const distributionsSnapshot = await getDocs(collection(db, 'distributions'))
    
    let totalDistributions = 0
    let valueDistributed = 0
    let quantitiesDistributed = 0 // Changed from recipients to quantities
    let pendingDistributions = 0
    
    distributionsSnapshot.forEach((doc) => {
      const data = doc.data()
      totalDistributions++
      
      if (data.status === 'pending') {
        pendingDistributions++
      }
      
      // Use actual total value from distribution
      if (data.totalValue && typeof data.totalValue === 'number') {
        valueDistributed += data.totalValue
      }
      
      // Count actual quantities distributed
      if (data.quantity && typeof data.quantity === 'number') {
        quantitiesDistributed += data.quantity
      }
    })
    
    return {
      totalDistributions,
      valueDistributed,
      recipients: quantitiesDistributed, // This now represents quantities distributed
      pendingDistributions
    }
  } catch (error) {
    console.error('Error calculating distribution stats:', error)
    // Return default values in case of error
    return {
      totalDistributions: 0,
      valueDistributed: 0,
      recipients: 0,
      pendingDistributions: 0
    }
  }
}

// Get recent distributions
export async function getRecentDistributions(limitCount = 5, categoryFilter?: string) {
  try {
    let q = query(
      collection(db, 'distributions'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    // Apply category filter if provided
    if (categoryFilter && categoryFilter !== 'all') {
      // First we need to get resources of this category to filter distributions
      const resourcesQuery = query(
        collection(db, 'resources'),
        where('category', '==', categoryFilter)
      )
      
      const resourcesSnapshot = await getDocs(resourcesQuery)
      const resourceIds = resourcesSnapshot.docs.map(doc => doc.id)
      
      if (resourceIds.length > 0) {
        // Filter distributions by resource IDs
        q = query(
          collection(db, 'distributions'),
          where('resourceId', 'in', resourceIds),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        )
      } else {
        // No resources in this category, return empty array
        return []
      }
    }
    
    const snapshot = await getDocs(q)
    const distributions: any[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      distributions.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      })
    })
    
    return distributions
  } catch (error) {
    console.error('Error fetching recent distributions:', error)
    return []
  }
}

// Get category distribution stats
export async function getCategoryStats(limitCount = 5, categoryFilter?: string) {
  try {
    // Fetch all resources and group by category
    const resourcesSnapshot = await getDocs(collection(db, 'resources'))
    
    // Fetch all distributions to calculate used quantities and values
    const distributionsSnapshot = await getDocs(collection(db, 'distributions'))
    
    const categoryMap: Record<string, { 
      value: number, 
      count: number, 
      totalQuantity: number, 
      usedQuantity: number,
      usedValue: number
    }> = {}
    
    // First, initialize categories with resource data
    resourcesSnapshot.forEach((doc) => {
      const data = doc.data()
      const category = data.category || 'Other'
      
      if (!categoryMap[category]) {
        categoryMap[category] = { 
          value: 0, 
          count: 0, 
          totalQuantity: 0, 
          usedQuantity: 0,
          usedValue: 0
        }
      }
      
      // Use actual resource value
      const resourceValue = (data.value || 0) * (data.quantity || 0)
      categoryMap[category].value += resourceValue
      categoryMap[category].count += 1
      categoryMap[category].totalQuantity += data.quantity || 0
    })
    
    // Then, calculate used quantities and values from distributions
    distributionsSnapshot.forEach((doc) => {
      const data = doc.data()
      // Find the resource for this distribution to get its category
      const resourceDoc = resourcesSnapshot.docs.find(r => r.id === data.resourceId)
      if (resourceDoc) {
        const resourceData = resourceDoc.data()
        const category = resourceData.category || 'Other'
        
        if (categoryMap[category]) {
          const quantity = data.quantity || 0
          const unitValue = resourceData.value || 0
          const totalValue = quantity * unitValue
          
          categoryMap[category].usedQuantity += quantity
          categoryMap[category].usedValue += totalValue
        }
      }
    })
    
    // Convert to array and calculate percentages based on used vs remaining
    const totalUsedQuantity = Object.values(categoryMap).reduce((sum, cat) => sum + cat.usedQuantity, 0)
    
    let result = Object.entries(categoryMap)
      .map(([category, data]) => {
        // Calculate remaining quantity
        const remainingQuantity = Math.max(0, data.totalQuantity - data.usedQuantity)
        // Total is used + remaining
        const totalCategoryQuantity = data.usedQuantity + remainingQuantity
        // Calculate percentage based on used quantity vs total quantity
        const percentage = totalCategoryQuantity > 0 ? Math.round((data.usedQuantity / totalCategoryQuantity) * 100) : 0
        
        return {
          category,
          value: data.usedValue, // Now showing used value instead of total resource value
          quantity: data.totalQuantity,
          used: data.usedQuantity,
          remaining: remainingQuantity,
          percentage: percentage
        }
      })
      .sort((a, b) => b.used - a.used) // Sort by used quantity descending
      
    // If a specific category is filtered, filter the results
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter(item => item.category === categoryFilter)
    }
    
    return result.slice(0, limitCount) // Limit to specified number of items
  } catch (error) {
    console.error('Error fetching category stats:', error)
    return []
  }
}

// Get all categories for filter dropdown
export async function getAllCategories() {
  try {
    const resourcesSnapshot = await getDocs(collection(db, 'resources'))
    const categories = new Set<string>()
    
    resourcesSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.category) {
        categories.add(data.category)
      }
    })
    
    return Array.from(categories).sort()
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

// Get distributions for CSV export (all data, no limit)
export async function getDistributionsForExport(categoryFilter?: string) {
  try {
    // Apply category filter if provided
    if (categoryFilter && categoryFilter !== 'all') {
      // First we need to get resources of this category to filter distributions
      const resourcesQuery = query(
        collection(db, 'resources'),
        where('category', '==', categoryFilter)
      )
      
      const resourcesSnapshot = await getDocs(resourcesQuery)
      const resourceIds = resourcesSnapshot.docs.map(doc => doc.id)
      
      if (resourceIds.length > 0) {
        // Filter distributions by resource IDs
        const distributionsQuery = query(
          collection(db, 'distributions'),
          where('resourceId', 'in', resourceIds),
          orderBy('createdAt', 'desc')
        )
        
        const snapshot = await getDocs(distributionsQuery)
        const distributions: any[] = []
        
        // Get all resources to map resource IDs to categories
        const allResourcesSnapshot = await getDocs(collection(db, 'resources'))
        const resourceMap: Record<string, any> = {}
        
        allResourcesSnapshot.forEach((doc) => {
          resourceMap[doc.id] = doc.data()
        })
        
        snapshot.forEach((doc) => {
          const data: any = doc.data()
          const resource = resourceMap[data.resourceId]
          
          distributions.push({
            id: doc.id,
            ...data,
            category: resource?.category || 'Unknown',
            createdAt: data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt 
              ? (data.createdAt as any).toDate() 
              : new Date(data.createdAt as any)
          })
        })
        
        return distributions
      } else {
        // No resources in this category, return empty array
        return []
      }
    } else {
      // No category filter, get all distributions
      const distributionsQuery = query(
        collection(db, 'distributions'),
        orderBy('createdAt', 'desc')
      )
      
      const snapshot = await getDocs(distributionsQuery)
      const distributions: any[] = []
      
      // Get all resources to map resource IDs to categories
      const resourcesSnapshot = await getDocs(collection(db, 'resources'))
      const resourceMap: Record<string, any> = {}
      
      resourcesSnapshot.forEach((doc) => {
        resourceMap[doc.id] = doc.data()
      })
      
      snapshot.forEach((doc) => {
        const data: any = doc.data()
        const resource = resourceMap[data.resourceId]
        
        distributions.push({
          id: doc.id,
          ...data,
          category: resource?.category || 'Unknown',
          createdAt: data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt 
            ? (data.createdAt as any).toDate() 
            : new Date(data.createdAt as any)
        })
      })
      
      return distributions
    }
  } catch (error) {
    console.error('Error fetching distributions for export:', error)
    return []
  }
}

// Get low stock resources
export async function getLowStockResources(threshold = 10) {
  try {
    const q = query(
      collection(db, 'resources'),
      where('quantity', '<=', threshold),
      where('quantity', '>', 0)
    )
    
    const snapshot = await getDocs(q)
    const lowStockResources: any[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      lowStockResources.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      })
    })
    
    return lowStockResources
  } catch (error) {
    console.error('Error fetching low stock resources:', error)
    return []
  }
}

// Get out of stock resources
export async function getOutOfStockResources() {
  try {
    const q = query(
      collection(db, 'resources'),
      where('quantity', '==', 0)
    )
    
    const snapshot = await getDocs(q)
    const outOfStockResources: any[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      outOfStockResources.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      })
    })
    
    return outOfStockResources
  } catch (error) {
    console.error('Error fetching out of stock resources:', error)
    return []
  }
}