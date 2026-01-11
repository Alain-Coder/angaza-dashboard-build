import { NextResponse } from 'next/server'
import firebaseConfig from '@/scripts/firebase-config'

// GET /api/resources - Get all resources
export async function GET() {
  try {
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const resourcesSnapshot = await db.collection('resources').get()
    const resources: any[] = []
    
    resourcesSnapshot.forEach((doc: any) => {
      resources.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    return NextResponse.json({ resources })
  } catch (error) {
    console.error('Error fetching resources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    )
  }
}

// POST /api/resources - Create a new resource
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
    if (!data.name || !data.category || data.quantity === undefined || !data.unit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const newResource = {
      ...data,
      value: data.value ? Number(data.value) : 0,
      quantity: Number(data.quantity),
      createdAt: new Date()
    }
    
    const docRef = await db.collection('resources').add(newResource)
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...newResource 
    })
  } catch (error) {
    console.error('Error creating resource:', error)
    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    )
  }
}

// PUT /api/resources/[id] - Update a resource
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const resourceId = params.id
    const data = await request.json()
    
    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      )
    }
    
    await db.collection('resources').doc(resourceId).update(data)
    
    return NextResponse.json({ message: 'Resource updated successfully' })
  } catch (error) {
    console.error('Error updating resource:', error)
    return NextResponse.json(
      { error: 'Failed to update resource' },
      { status: 500 }
    )
  }
}

// DELETE /api/resources/[id] - Delete a resource
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const resourceId = params.id
    
    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      )
    }
    
    await db.collection('resources').doc(resourceId).delete()
    
    return NextResponse.json({ message: 'Resource deleted successfully' })
  } catch (error) {
    console.error('Error deleting resource:', error)
    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 }
    )
  }
}