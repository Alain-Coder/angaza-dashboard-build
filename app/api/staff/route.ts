import { NextResponse } from 'next/server'
import { db } from '@/scripts/firebase-config'

// GET /api/staff - Get all staff members
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    // Fetch system users (from users collection)
    const usersSnapshot = await db.collection('users').get()
    
    // Fetch non-system staff (from staff collection)
    const staffSnapshot = await db.collection('staff').get()
    
    const staffData: any[] = []
    
    // Process system users
    usersSnapshot.forEach((doc: any) => {
      const data = doc.data()
      // Exclude system admins from staff list
      if (data.role && data.role !== 'system admin') {
        staffData.push({
          id: doc.id,
          name: data.name || data.displayName || 'Unknown User',
          email: data.email || '',
          role: data.role || 'No Role',
          department: data.department || '',
          position: data.position || '',
          status: data.status || 'Active',
          phoneNumber: data.phoneNumber || '',
          address: data.address || '',
          dateOfBirth: data.dateOfBirth?.toDate ? data.dateOfBirth.toDate() : null,
          hireDate: data.hireDate?.toDate ? data.hireDate.toDate() : null,
          isSystemUser: true,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null
        })
      }
    })
    
    // Process non-system staff
    staffSnapshot.forEach((doc: any) => {
      const data = doc.data()
      staffData.push({
        id: doc.id,
        name: data.name || 'Unknown Staff',
        email: data.email || '',
        role: data.role || 'No Role',
        department: data.department || '',
        position: data.position || '',
        status: data.status || 'Active',
        phoneNumber: data.phoneNumber || '',
        address: data.address || '',
        dateOfBirth: data.dateOfBirth?.toDate ? data.dateOfBirth.toDate() : null,
        hireDate: data.hireDate?.toDate ? data.hireDate.toDate() : null,
        isSystemUser: false,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null
      })
    })
    
    return NextResponse.json({ staff: staffData })
  } catch (error: any) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}