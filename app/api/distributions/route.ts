import { NextResponse } from 'next/server'
// Import from the shared firebase config instead of initializing separately
import firebaseConfig from '@/scripts/firebase-config'

// GET /api/distributions - Get all distributions
export async function GET(request: Request) {
  try {
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const pageParam = searchParams.get('page')
    const categoryParam = searchParams.get('category')
    
    const limitValue = limitParam ? parseInt(limitParam) : 50
    const pageValue = pageParam ? parseInt(pageParam) : 1
    
    // If category filter is applied, we need to get resource IDs for that category first
    if (categoryParam && categoryParam !== 'all') {
      // Get resources for this category
      const resourcesSnapshot = await db.collection('resources')
        .where('category', '==', categoryParam)
        .get()
      
      const resourceIds = resourcesSnapshot.docs.map((doc: any) => doc.id)
      
      if (resourceIds.length > 0) {
        // Get distributions for these resources
        let distributionsQuery = db.collection('distributions')
          .where('resourceId', 'in', resourceIds)
          .orderBy('createdAt', 'desc')
        
        if (limitValue > 0) {
          distributionsQuery = distributionsQuery.limit(limitValue)
        }
        
        const distributionsSnapshot = await distributionsQuery.get()
        const distributions: any[] = []
        
        // Get all resources to map resource IDs to categories
        const allResourcesSnapshot = await db.collection('resources').get()
        const resourceMap: Record<string, any> = {}
        
        allResourcesSnapshot.forEach((doc: any) => {
          resourceMap[doc.id] = doc.data()
        })
        
        distributionsSnapshot.forEach((doc: any) => {
          const data = doc.data()
          const resource = resourceMap[data.resourceId]
          
          distributions.push({
            id: doc.id,
            ...data,
            category: resource?.category || 'Unknown'
          })
        })
        
        // Get total count for pagination
        const countQuery = db.collection('distributions')
          .where('resourceId', 'in', resourceIds)
        const countSnapshot = await countQuery.get()
        const totalCount = countSnapshot.size
        
        return NextResponse.json({ distributions, totalCount })
      } else {
        // No resources in this category, return empty result
        return NextResponse.json({ distributions: [], totalCount: 0 })
      }
    }
    
    // No category filter, get all distributions
    let distributionsQuery = db.collection('distributions')
      .orderBy('createdAt', 'desc')
    
    if (limitValue > 0) {
      distributionsQuery = distributionsQuery.limit(limitValue)
    }
    
    const distributionsSnapshot = await distributionsQuery.get()
    const distributions: any[] = []
    
    // Get all resources to map resource IDs to categories
    const resourcesSnapshot = await db.collection('resources').get()
    const resourceMap: Record<string, any> = {}
    
    resourcesSnapshot.forEach((doc: any) => {
      resourceMap[doc.id] = doc.data()
    })
    
    distributionsSnapshot.forEach((doc: any) => {
      const data = doc.data()
      const resource = resourceMap[data.resourceId]
      
      distributions.push({
        id: doc.id,
        ...data,
        category: resource?.category || 'Unknown'
      })
    })
    
    // Get total count for pagination
    const countSnapshot = await db.collection('distributions').get()
    const totalCount = countSnapshot.size
    
    return NextResponse.json({ distributions, totalCount })
  } catch (error) {
    console.error('Error fetching distributions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch distributions' },
      { status: 500 }
    )
  }
}

// POST /api/distributions - Create a new distribution
export async function POST(request: Request) {
  try {
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const data = await request.json()
    
    // Validate required fields
    if (!data.resourceId || !data.resourceName || !data.quantity || !data.recipient || !data.location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Calculate values if not provided
    const quantity = Number(data.quantity)
    const unitValue = data.unitValue ? Number(data.unitValue) : 0
    const totalValue = data.totalValue ? Number(data.totalValue) : (unitValue * quantity)
    
    // Create distribution record with pending status
    const distributionData = {
      ...data,
      quantity: quantity,
      unitValue: unitValue,
      totalValue: totalValue,
      status: 'pending', // Set initial status to pending
      createdAt: new Date()
    }
    
    const docRef = await db.collection('distributions').add(distributionData)
    
    // Update resource stock
    try {
      // Note: In a production environment, you would fetch the current quantity
      // and update it atomically to prevent race conditions
      await db.collection('resources').doc(data.resourceId).update({
        quantity: data.newQuantity // This should be calculated on the client side
      })
    } catch (stockError) {
      console.error('Error updating resource stock:', stockError)
      // Consider rolling back the distribution creation if stock update fails
    }
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...distributionData 
    })
  } catch (error) {
    console.error('Error creating distribution:', error)
    return NextResponse.json(
      { error: 'Failed to create distribution' },
      { status: 500 }
    )
  }
}