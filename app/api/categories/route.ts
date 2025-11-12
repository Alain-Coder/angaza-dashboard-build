import { NextResponse } from 'next/server'
import { db } from '@/scripts/firebase-config'

// GET /api/categories - Get all categories
export async function GET() {
  try {
    console.log('=== GET All Categories Request ===')
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    console.log('Fetching all categories from Firestore...')
    const categoriesSnapshot = await db.collection('categories').get()
    const categories: any[] = []
    
    categoriesSnapshot.forEach((doc: any) => {
      categories.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    console.log(`Found ${categories.length} categories`)
    
    return NextResponse.json({ 
      success: true,
      categories 
    })
  } catch (error: any) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create a new category
export async function POST(request: Request) {
  try {
    console.log('=== POST Category Request ===')
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const data = await request.json()
    console.log('Category data:', data)
    
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }
    
    const categoryName = data.name.trim()
    
    // Check if category already exists
    console.log('Checking if category exists:', categoryName)
    const q = db.collection('categories').where('name', '==', categoryName)
    const querySnapshot = await q.get()
    
    if (!querySnapshot.empty) {
      console.log('Category already exists:', categoryName)
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 400 }
      )
    }
    
    const newCategory = {
      name: categoryName,
      createdAt: new Date().toISOString()
    }
    
    console.log('Creating new category:', newCategory)
    const docRef = await db.collection('categories').add(newCategory)
    
    console.log('Category created with ID:', docRef.id)
    
    return NextResponse.json({ 
      success: true,
      id: docRef.id, 
      ...newCategory 
    })
  } catch (error: any) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    )
  }
}