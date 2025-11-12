import { NextResponse } from 'next/server'
import { db } from '@/scripts/firebase-config'
import { CollectionReference, Query } from 'firebase-admin/firestore'

// GET /api/partners - Get all partners with optional search and filter
export async function GET(request: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    let partnersQuery: CollectionReference | Query = db.collection('partners')

    // Apply search filter
    if (search) {
      partnersQuery = partnersQuery.where('name', '>=', search).where('name', '<=', search + '\uf8ff')
    }

    // Apply type filter
    if (type && type !== 'all') {
      partnersQuery = partnersQuery.where('type', '==', type)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    partnersQuery = partnersQuery.limit(limit).offset(offset)

    const partnersSnapshot = await partnersQuery.get()
    const partners: any[] = []
    
    partnersSnapshot.forEach((doc: any) => {
      partners.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    // Get total count for pagination
    let countQuery: CollectionReference | Query = db.collection('partners')
    if (search) {
      countQuery = countQuery.where('name', '>=', search).where('name', '<=', search + '\uf8ff')
    }
    if (type && type !== 'all') {
      countQuery = countQuery.where('type', '==', type)
    }
    
    const countSnapshot = await countQuery.count().get()
    const totalCount = countSnapshot.data().count
    
    return NextResponse.json({ 
      partners,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      }
    })
  } catch (error: any) {
    console.error('Error fetching partners:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}

// POST /api/partners - Create a new partner
export async function POST(request: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const data = await request.json()
    
    // Validate required fields
    if (!data.name || !data.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name and type are required' },
        { status: 400 }
      )
    }
    
    const newPartner = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const docRef = await db.collection('partners').add(newPartner)
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...newPartner 
    })
  } catch (error: any) {
    console.error('Error creating partner:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create partner' },
      { status: 500 }
    )
  }
}

// PUT /api/partners/[id] - Update a partner
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const partnerId = params.id
    const data = await request.json()
    
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }
    
    await db.collection('partners').doc(partnerId).update({
      ...data,
      updatedAt: new Date()
    })
    
    return NextResponse.json({ message: 'Partner updated successfully' })
  } catch (error: any) {
    console.error('Error updating partner:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update partner' },
      { status: 500 }
    )
  }
}

// DELETE /api/partners/[id] - Delete a partner
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const partnerId = params.id
    
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }
    
    await db.collection('partners').doc(partnerId).delete()
    
    return NextResponse.json({ message: 'Partner deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting partner:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete partner' },
      { status: 500 }
    )
  }
}