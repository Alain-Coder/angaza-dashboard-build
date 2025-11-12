import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin SDK if not already initialized
// Only initialize if we have the required environment variables
const hasFirebaseConfig = process.env.FIREBASE_PROJECT_ID && 
                         process.env.FIREBASE_PRIVATE_KEY && 
                         process.env.FIREBASE_CLIENT_EMAIL;

let auth: admin.auth.Auth | null = null;
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
    auth = getAuth()
    db = getFirestore()
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
    auth = null
    db = null
  }
} else {
  console.log('Firebase environment variables not found')
}

export async function POST(request: Request) {
  try {
    if (!hasFirebaseConfig) {
      return NextResponse.json(
        { error: 'Firebase configuration not found' },
        { status: 500 }
      )
    }
    
    if (!auth || !db) {
      return NextResponse.json(
        { error: 'Firebase services not initialized' },
        { status: 500 }
      )
    }

    const { name, email, password, role, department } = await request.json()
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create user in Firebase Authentication (without automatic sign-in)
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    })

    // Create user document in Firestore
    const userData = {
      uid: userRecord.uid,
      name,
      email,
      role,
      status: 'Active',
      createdAt: new Date(),
      ...(department && department !== 'no-department' && { department }) // Only add department if it exists and is not 'no-department'
    }

    await db.collection('users').doc(userRecord.uid).set(userData)

    return NextResponse.json({ 
      success: true, 
      user: {
        id: userRecord.uid,
        ...userData
      }
    })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    if (!hasFirebaseConfig) {
      return NextResponse.json(
        { error: 'Firebase configuration not found' },
        { status: 500 }
      )
    }
    
    if (!auth || !db) {
      return NextResponse.json(
        { error: 'Firebase services not initialized' },
        { status: 500 }
      )
    }

    const { userId } = await request.json()
    
    // Validate required field
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      )
    }

    // Delete user from Firebase Authentication
    await auth.deleteUser(userId)

    // Delete user document from Firestore
    await db.collection('users').doc(userId).delete()

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully from both Authentication and Firestore'
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}