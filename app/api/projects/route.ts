import { NextResponse } from 'next/server'
import { db } from '@/scripts/firebase-config'

// GET /api/projects - Get all projects
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const projectsSnapshot = await db.collection('projects').get()
    const projects: any[] = []
    
    projectsSnapshot.forEach((doc: any) => {
      const data = doc.data()
      projects.push({
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      })
    })
    
    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
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
    if (!data.name || !data.description || !data.status || data.budget === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Create project record
    const projectData = {
      ...data,
      budget: Number(data.budget),
      spent: data.spent ? Number(data.spent) : 0,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const docRef = await db.collection('projects').add(projectData)
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...projectData 
    })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}