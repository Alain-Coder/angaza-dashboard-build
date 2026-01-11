// scripts/check-admin.js
const admin = require('firebase-admin')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

// Only initialize if we have the required environment variables
const hasFirebaseConfig = process.env.FIREBASE_PROJECT_ID && 
                         process.env.FIREBASE_PRIVATE_KEY && 
                         process.env.FIREBASE_CLIENT_EMAIL;

let db = null;

if (hasFirebaseConfig) {
  try {
    // Initialize Firebase Admin SDK
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\n'),
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

    db = admin.firestore()
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
  }
}

async function checkSystemAdmin() {
  try {
    if (!hasFirebaseConfig) {
      console.log('Firebase configuration not found. Please set the required environment variables.')
      return
    }
    
    if (!db) {
      console.log('Database not initialized')
      return
    }

    // Find the user with admin email
    const userSnapshot = await db.collection('users')
      .where('email', '==', 'admin@angazafoundation.org')
      .limit(1)
      .get()

    if (userSnapshot.empty) {
      console.log('No system admin user found')
      return
    }

    const userDoc = userSnapshot.docs[0]
    const userData = userDoc.data()
    
    console.log('System admin user found:')
    console.log('UID:', userDoc.id)
    console.log('Email:', userData.email)
    console.log('Name:', userData.name)
    console.log('Role:', userData.role)
    console.log('Created At:', userData.createdAt?.toDate())
    
    // Check if role is correct
    if (userData.role === 'system admin') {
      console.log('✅ Role is correctly set to "system admin"')
    } else {
      console.log('❌ Role is not set correctly. Current role:', userData.role)
    }
  } catch (error) {
    console.log('Error checking system admin user:', error)
  }
}

checkSystemAdmin()