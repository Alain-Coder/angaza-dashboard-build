import { NextResponse } from 'next/server'
import { db } from '@/scripts/firebase-config'

// GET /api/departments - Get all departments
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const departmentsSnapshot = await db.collection('departments').get()
    const departments: any[] = []
    
    departmentsSnapshot.forEach((doc: any) => {
      const data = doc.data()
      departments.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      })
    })
    
    return NextResponse.json({ departments })
  } catch (error) {
    console.error('Error fetching departments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    )
  }
}

// POST /api/departments - Create a new department
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
    if (!data.name) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      )
    }
    
    // Check if department already exists
    const q = db.collection('departments').where('name', '==', data.name)
    const querySnapshot = await q.get()
    
    if (!querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Department already exists' },
        { status: 400 }
      )
    }
    
    // Create department record
    const departmentData = {
      name: data.name,
      description: data.description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const docRef = await db.collection('departments').add(departmentData)
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...departmentData 
    })
  } catch (error) {
    console.error('Error creating department:', error)
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    )
  }
}