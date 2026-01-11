import { NextResponse } from 'next/server'
import firebaseConfig from '@/scripts/firebase-config'

// GET /api/beneficiaries - Get all beneficiaries
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
    
    // Get all beneficiaries
    let beneficiariesQuery = db.collection('beneficiaries')
      .orderBy('createdAt', 'desc')
    
    if (limitValue > 0) {
      beneficiariesQuery = beneficiariesQuery.limit(limitValue)
    }
    
    const beneficiariesSnapshot = await beneficiariesQuery.get()
    const beneficiaries: any[] = []
    
    beneficiariesSnapshot.forEach((doc: any) => {
      const data = doc.data()
      beneficiaries.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
      })
    })
    
    // Get total count for pagination
    const countSnapshot = await db.collection('beneficiaries').get()
    const totalCount = countSnapshot.size
    
    return NextResponse.json({ beneficiaries, totalCount })
  } catch (error) {
    console.error('Error fetching beneficiaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch beneficiaries' },
      { status: 500 }
    )
  }
}

// POST /api/beneficiaries - Create a new beneficiary
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
    if (!data.name || !data.program || !data.contact) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Create beneficiary record
    const beneficiaryData = {
      ...data,
      createdAt: new Date()
    }
    
    const docRef = await db.collection('beneficiaries').add(beneficiaryData)
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...beneficiaryData 
    })
  } catch (error) {
    console.error('Error creating beneficiary:', error)
    return NextResponse.json(
      { error: 'Failed to create beneficiary' },
      { status: 500 }
    )
  }
}