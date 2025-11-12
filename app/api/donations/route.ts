import { NextResponse } from 'next/server'
import { db } from '@/scripts/firebase-config'

// GET /api/donations - Get all donations
export async function GET(request: Request) {
  try {
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
    
    // Get all donations
    let donationsQuery = db.collection('donations')
      .orderBy('createdAt', 'desc')
    
    if (limitValue > 0) {
      donationsQuery = donationsQuery.limit(limitValue)
    }
    
    const donationsSnapshot = await donationsQuery.get()
    const donations: any[] = []
    
    donationsSnapshot.forEach((doc: any) => {
      const data = doc.data()
      donations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        date: data.date?.toDate ? data.date.toDate() : data.date
      })
    })
    
    // Get total count for pagination
    const countSnapshot = await db.collection('donations').get()
    const totalCount = countSnapshot.size
    
    return NextResponse.json({ donations, totalCount })
  } catch (error) {
    console.error('Error fetching donations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch donations' },
      { status: 500 }
    )
  }
}

// POST /api/donations - Create a new donation
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
    if (!data.donor || !data.amount || !data.method || !data.project) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Create donation record
    const donationData = {
      ...data,
      amount: Number(data.amount),
      recurring: data.recurring || false,
      createdAt: new Date(),
      date: data.date ? new Date(data.date) : new Date()
    }
    
    const docRef = await db.collection('donations').add(donationData)
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...donationData 
    })
  } catch (error) {
    console.error('Error creating donation:', error)
    return NextResponse.json(
      { error: 'Failed to create donation' },
      { status: 500 }
    )
  }
}

// PUT /api/donations/[id] - Update a donation
export async function PUT(request: Request) {
  try {
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
        { error: 'Donation ID is required' },
        { status: 400 }
      )
    }
    
    const data = await request.json()
    
    // Update donation record
    const updateData = {
      ...data,
      amount: data.amount ? Number(data.amount) : undefined,
      date: data.date ? new Date(data.date) : undefined,
      updatedAt: new Date()
    }
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    )
    
    await db.collection('donations').doc(id).update(updateData)
    
    return NextResponse.json({ message: 'Donation updated successfully' })
  } catch (error) {
    console.error('Error updating donation:', error)
    return NextResponse.json(
      { error: 'Failed to update donation' },
      { status: 500 }
    )
  }
}

// DELETE /api/donations/[id] - Delete a donation
export async function DELETE(request: Request) {
  try {
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
        { error: 'Donation ID is required' },
        { status: 400 }
      )
    }
    
    await db.collection('donations').doc(id).delete()
    
    return NextResponse.json({ message: 'Donation deleted successfully' })
  } catch (error) {
    console.error('Error deleting donation:', error)
    return NextResponse.json(
      { error: 'Failed to delete donation' },
      { status: 500 }
    )
  }
}