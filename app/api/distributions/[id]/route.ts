import { NextResponse } from 'next/server'
import { db } from '@/scripts/firebase-config'

interface RouteParams {
  params: {
    id: string
  }
}

// Simple parameter extraction
function getDistributionId(request: Request, params: { id: string }): string | null {
  console.log('=== Parameter Analysis ===')
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
    
    // Extract ID from /api/distributions/[id]
    const match = pathname.match(/\/api\/distributions\/([^\/?]+)/)
    if (match && match[1]) {
      return match[1]
    }
  } catch (error) {
    console.error('Error parsing URL:', error)
  }
  
  return null
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    console.log('=== PUT Distribution Request ===')
    console.log('Request URL:', request.url)
    console.log('Params:', params)
    
    if (!db) {
      console.error('Firestore not initialized')
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const distributionId = getDistributionId(request, params)
    console.log('Extracted distribution ID:', distributionId)
    
    if (!distributionId) {
      return NextResponse.json(
        { error: 'Distribution ID is required' },
        { status: 400 }
      )
    }

    let updateData: any
    try {
      updateData = await request.json()
      console.log('Update data:', updateData)
    } catch (error) {
      console.error('JSON parse error:', error)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Check if distribution exists
    console.log('Checking distribution in Firestore:', distributionId)
    const distributionDoc = await db.collection('distributions').doc(distributionId).get()
    
    if (!distributionDoc.exists) {
      console.log('Distribution not found:', distributionId)
      return NextResponse.json(
        { error: 'Distribution not found' },
        { status: 404 }
      )
    }

    console.log('Distribution found, updating...')
    
    // Add timestamp
    const dataWithTimestamp = {
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    await db.collection('distributions').doc(distributionId).update(dataWithTimestamp)
    
    console.log('Distribution updated successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Distribution updated successfully',
      id: distributionId
    })

  } catch (error: any) {
    console.error('Error in PUT handler:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    console.log('=== GET Distribution Request ===')
    console.log('Params:', params)
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const distributionId = getDistributionId(request, params)
    console.log('Distribution ID for GET:', distributionId)
    
    if (!distributionId) {
      return NextResponse.json(
        { error: 'Distribution ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching distribution:', distributionId)
    const distributionDoc = await db.collection('distributions').doc(distributionId).get()
    
    if (!distributionDoc.exists) {
      return NextResponse.json(
        { error: 'Distribution not found' },
        { status: 404 }
      )
    }

    const distributionData = distributionDoc.data()
    
    // Check if distributionData exists before using it
    if (!distributionData) {
      return NextResponse.json(
        { error: 'Distribution data is empty' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      id: distributionId,
      exists: true,
      data: {
        id: distributionId,
        ...distributionData,
        createdAt: distributionData?.createdAt?.toDate ? distributionData.createdAt.toDate().toISOString() : distributionData?.createdAt,
        updatedAt: distributionData?.updatedAt?.toDate ? distributionData.updatedAt.toDate().toISOString() : distributionData?.updatedAt
      }
    })

  } catch (error: any) {
    console.error('Error in GET handler:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    console.log('=== DELETE Distribution Request ===')
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const distributionId = getDistributionId(request, params)
    
    if (!distributionId) {
      return NextResponse.json(
        { error: 'Distribution ID is required' },
        { status: 400 }
      )
    }

    const distributionDoc = await db.collection('distributions').doc(distributionId).get()
    
    if (!distributionDoc.exists) {
      return NextResponse.json(
        { error: 'Distribution not found' },
        { status: 404 }
      )
    }

    await db.collection('distributions').doc(distributionId).delete()
    
    return NextResponse.json({
      success: true,
      message: 'Distribution deleted successfully'
    })

  } catch (error: any) {
    console.error('Error in DELETE handler:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}