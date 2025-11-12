// scripts/init-admin.js
const admin = require('firebase-admin')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Only initialize if we have the required environment variables
const hasFirebaseConfig = process.env.FIREBASE_PROJECT_ID && 
                         process.env.FIREBASE_PRIVATE_KEY && 
                         process.env.FIREBASE_CLIENT_EMAIL;

let auth = null;
let db = null;

if (hasFirebaseConfig) {
  try {
    // Initialize Firebase Admin SDK
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      })
    }

    auth = admin.auth()
    db = admin.firestore()
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
  }
}

async function createSystemAdmin() {
  try {
    if (!hasFirebaseConfig) {
      console.log('Firebase configuration not found. Please set the required environment variables.')
      return
    }
    
    if (!auth || !db) {
      console.log('Firebase services not initialized')
      return
    }

    // Create the system admin user
    const userRecord = await auth.createUser({
      email: 'admin@angazafoundation.org',
      password: 'Admin123!',
      displayName: 'System Administrator'
    })

    console.log('Successfully created new user:', userRecord.uid)

    // Add the user to Firestore with system admin role
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: 'admin@angazafoundation.org',
      name: 'System Administrator',
      role: 'system admin',
      createdAt: new Date()
    })

    console.log('Successfully added user to Firestore with system admin role')
  } catch (error) {
    console.log('Error creating system admin user:', error)
  }
}

createSystemAdmin()