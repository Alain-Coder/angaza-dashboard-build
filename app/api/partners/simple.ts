import { NextResponse } from 'next/server'
import firebaseConfig from '@/scripts/firebase-config'

// GET /api/partners/simple - Get all partners without pagination
export async function GET() {
  try {
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const partnersSnapshot = await db.collection('partners').get()
    const partners: any[] = []
    
    partnersSnapshot.forEach((doc: any) => {
      partners.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    return NextResponse.json({ partners })
  } catch (error: any) {
    console.error('Error fetching partners:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}