import { NextResponse } from 'next/server'
import { db } from '@/scripts/firebase-config'

// GET /api/grants - Get all grants
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const grantsSnapshot = await db.collection('grants').get()
    const grants: any[] = []
    
    grantsSnapshot.forEach((doc: any) => {
      const data = doc.data()
      grants.push({
        id: doc.id,
        ...data,
        amount: Number(data.amount),
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      })
    })
    
    return NextResponse.json({ grants })
  } catch (error) {
    console.error('Error fetching grants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grants' },
      { status: 500 }
    )
  }
}

// POST /api/grants - Create a new grant
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
    if (!data.name || !data.funder || !data.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: name, funder, amount' },
        { status: 400 }
      )
    }
    
    // Create grant record
    const grantData = {
      ...data,
      amount: Number(data.amount),
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : new Date(),
      status: data.status || 'active',
      utilizationRate: data.utilizationRate ? Number(data.utilizationRate) : 0,
      reportsDue: data.reportsDue ? Number(data.reportsDue) : 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const docRef = await db.collection('grants').add(grantData)
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...grantData 
    })
  } catch (error) {
    console.error('Error creating grant:', error)
    return NextResponse.json(
      { error: 'Failed to create grant' },
      { status: 500 }
    )
  }
}

// PUT /api/grants/[id] - Update a grant
export async function PUT(request: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Grant ID is required' },
        { status: 400 }
      )
    }

    const data = await request.json()
    
    // Update grant record
    const grantData = {
      ...data,
      amount: data.amount !== undefined ? Number(data.amount) : undefined,
      utilizationRate: data.utilizationRate !== undefined ? Number(data.utilizationRate) : undefined,
      reportsDue: data.reportsDue !== undefined ? Number(data.reportsDue) : undefined,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      updatedAt: new Date()
    }
    
    // Remove undefined values
    Object.keys(grantData).forEach(key => 
      grantData[key] === undefined && delete grantData[key]
    )
    
    await db.collection('grants').doc(id).update(grantData)
    
    return NextResponse.json({ 
      id,
      ...grantData 
    })
  } catch (error) {
    console.error('Error updating grant:', error)
    return NextResponse.json(
      { error: 'Failed to update grant' },
      { status: 500 }
    )
  }
}

// DELETE /api/grants/[id] - Delete a grant
export async function DELETE(request: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Grant ID is required' },
        { status: 400 }
      )
    }

    await db.collection('grants').doc(id).delete()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting grant:', error)
    return NextResponse.json(
      { error: 'Failed to delete grant' },
      { status: 500 }
    )
  }
}