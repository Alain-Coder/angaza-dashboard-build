import { NextResponse } from 'next/server'
import { db } from '@/scripts/firebase-config'

// GET /api/beneficiaries - Get all beneficiaries
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const beneficiariesSnapshot = await db.collection('beneficiaries').get()
    const beneficiaries: any[] = []
    
    beneficiariesSnapshot.forEach((doc: any) => {
      const data = doc.data()
      beneficiaries.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      })
    })
    
    return NextResponse.json({ beneficiaries })
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
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const data = await request.json()
    
    // Validate required fields
    if (!data.name || !data.community || !data.gender) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Create beneficiary record
    const beneficiaryData = {
      ...data,
      age: data.age ? Number(data.age) : 0,
      createdAt: new Date(),
      updatedAt: new Date()
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