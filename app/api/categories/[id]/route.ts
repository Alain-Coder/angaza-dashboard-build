import { NextResponse } from 'next/server'
import firebaseConfig from '@/scripts/firebase-config'

interface RouteParams {
  params: {
    id: string
  }
}

// Helper function to extract category ID
function getCategoryId(request: Request, params: { id: string }): string | null {
  console.log('=== Category ID Extraction ===')
  console.log('Params object:', params)
  console.log('Params.id:', params?.id)
  
  // First try: from Next.js params
  if (params?.id && params.id !== 'undefined' && params.id !== 'null') {
    return params.id
  }
  
  // Second try: from URL path
  try {
    const url = new URL(request.url)
    const pathname = url.pathname
    console.log('Full pathname:', pathname)
    
    // Extract ID from /api/categories/[id]
    const match = pathname.match(/\/api\/categories\/([^\/?]+)/)
    if (match && match[1]) {
      return match[1]
    }
  } catch (error) {
    console.error('Error parsing URL:', error)
  }
  
  return null
}

// DELETE /api/categories/[id] - Delete a category
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    console.log('=== DELETE Category Request ===')
    console.log('Request URL:', request.url)
    console.log('Params:', params)
    
    const db = firebaseConfig.db;
    if (!db) {
      console.error('Firestore not initialized')
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const categoryId = getCategoryId(request, params)
    console.log('Extracted category ID:', categoryId)
    
    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // First get the category to check its name
    console.log('Fetching category from Firestore:', categoryId)
    const categoryDoc = await db.collection('categories').doc(categoryId).get()
    
    if (!categoryDoc.exists) {
      console.log('Category not found:', categoryId)
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const categoryData = categoryDoc.data()
    console.log('Category data:', categoryData)
    
    // Check if category is being used by any resources
    console.log('Checking if category is used by resources...')
    const q = db.collection('resources').where('category', '==', categoryData?.name)
    const querySnapshot = await q.get()
    
    if (!querySnapshot.empty) {
      console.log('Category is being used by resources, cannot delete')
      return NextResponse.json(
        { error: 'Cannot delete category that is being used by resources' },
        { status: 400 }
      )
    }

    console.log('Category not in use, proceeding with deletion...')
    await db.collection('categories').doc(categoryId).delete()
    
    console.log('Category deleted successfully:', categoryId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Category deleted successfully' 
    })
    
  } catch (error: any) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete category' },
      { status: 500 }
    )
  }
}

// GET /api/categories/[id] - Get a specific category (for testing)
export async function GET(request: Request, { params }: RouteParams) {
  try {
    console.log('=== GET Category Request ===')
    console.log('Params:', params)
    
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const categoryId = getCategoryId(request, params)
    console.log('Category ID for GET:', categoryId)
    
    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching category:', categoryId)
    const categoryDoc = await db.collection('categories').doc(categoryId).get()
    
    if (!categoryDoc.exists) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    const categoryData = categoryDoc.data()
    
    return NextResponse.json({
      success: true,
      id: categoryId,
      exists: true,
      data: {
        id: categoryId,
        ...categoryData,
        createdAt: categoryData?.createdAt?.toDate ? categoryData.createdAt.toDate().toISOString() : categoryData?.createdAt
      }
    })

  } catch (error: any) {
    console.error('Error in GET category handler:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch category' },
      { status: 500 }
    )
  }
}