import { NextResponse } from 'next/server'
import firebaseConfig from '@/scripts/firebase-config'

// GET /api/programs - Get all programs
export async function GET() {
  try {
    const db = firebaseConfig.db;
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    const programsSnapshot = await db.collection('programs').get()
    const programs: any[] = []
    
    programsSnapshot.forEach((doc: any) => {
      const data = doc.data()
      programs.push({
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate ? data.startDate.toDate() : data.startDate,
        endDate: data.endDate?.toDate ? data.endDate.toDate() : data.endDate,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      })
    })
    
    return NextResponse.json({ programs })
  } catch (error) {
    console.error('Error fetching programs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch programs' },
      { status: 500 }
    )
  }
}