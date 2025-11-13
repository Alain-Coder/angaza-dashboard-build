import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK if not already initialized
// Only initialize if we have the required environment variables
const hasFirebaseConfig = process.env.FIREBASE_PROJECT_ID && 
                         process.env.FIREBASE_PRIVATE_KEY && 
                         process.env.FIREBASE_CLIENT_EMAIL;

let db: admin.firestore.Firestore | null = null;

if (hasFirebaseConfig) {
  try {
    if (!getApps().length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      })
    }
    db = getFirestore()
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
    db = null
  }
} else {
  console.log('Firebase environment variables not found')
}

// POST - Fetch all users for sharing dropdown
export async function POST(request: Request) {
  try {
    if (!hasFirebaseConfig) {
      return NextResponse.json(
        { error: 'Firebase configuration not found' },
        { status: 500 }
      )
    }
    
    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      )
    }

    // Parse the request body to get the current user ID
    const { currentUserId } = await request.json()
    
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Missing current user ID' },
        { status: 400 }
      )
    }

    try {
      // Fetch all users except the current user and system admins
      const usersSnapshot = await db.collection('users').get()
      
      const users = usersSnapshot.docs
        .filter(doc => {
          // Exclude current user
          if (doc.id === currentUserId) return false
          
          const data = doc.data()
          // Exclude system admins
          if (data.role === 'system admin') return false
          
          return true
        })
        .map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name || 'Unknown User',
            email: data.email || '',
            role: data.role || 'user'
          }
        })
      
      return NextResponse.json({ 
        success: true, 
        users
      })
    } catch (queryError: any) {
      console.error('Query error:', queryError)
      return NextResponse.json(
        { error: 'Database query failed: ' + queryError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}