import { NextResponse } from 'next/server'
import firebaseConfig from '@/scripts/firebase-config'

// GET /api/partners - Get all partners
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
    
    const limitValue = limitParam ? parseInt(limitParam) : 50
    const pageValue = pageParam ? parseInt(pageParam) : 1
    
    // Get all partners
    let partnersQuery = db.collection('partners')
      .orderBy('createdAt', 'desc')
    
    if (limitValue > 0) {
      partnersQuery = partnersQuery.limit(limitValue)
    }
    
    const partnersSnapshot = await partnersQuery.get()
    const partners: any[] = []
    
    partnersSnapshot.forEach((doc: any) => {
      const data = doc.data()
      partners.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
      })
    })
    
    // Get total count for pagination
    const countSnapshot = await db.collection('partners').get()
    const totalCount = countSnapshot.size
    
    return NextResponse.json({ partners, totalCount })
  } catch (error) {
    console.error('Error fetching partners:', error)
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}

// POST /api/partners - Create a new partner
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
    if (!data.name || !data.contactPerson || !data.email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Create partner record
    const partnerData = {
      ...data,
      createdAt: new Date()
    }
    
    const docRef = await db.collection('partners').add(partnerData)
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...partnerData 
    })
  } catch (error) {
    console.error('Error creating partner:', error)
    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    )
  }
}

// PUT /api/partners/[id] - Update a partner
export async function PUT(request: Request) {
  try {
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }
    
    const data = await request.json()
    
    // Update partner record
    const updateData = {
      ...data,
      updatedAt: new Date()
    }
    
    await db.collection('partners').doc(id).update(updateData)
    
    return NextResponse.json({ message: 'Partner updated successfully' })
  } catch (error) {
    console.error('Error updating partner:', error)
    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    )
  }
}

// DELETE /api/partners/[id] - Delete a partner
export async function DELETE(request: Request) {
  try {
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }
    
    await db.collection('partners').doc(id).delete()
    
    return NextResponse.json({ message: 'Partner deleted successfully' })
  } catch (error) {
    console.error('Error deleting partner:', error)
    return NextResponse.json(
      { error: 'Failed to delete partner' },
      { status: 500 }
    )
  }
}