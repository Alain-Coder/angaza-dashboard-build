import admin from 'firebase-admin'
import { getApps } from 'firebase-admin/app'

// Function to properly format the private key for different environments
function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined
  
  // Replace escaped newlines with actual newlines
  return key.replace(/\\n/g, '\n')
}

// Check if we have all required environment variables
const hasFirebaseAdminConfig = process.env.FIREBASE_PROJECT_ID && 
                              process.env.FIREBASE_PRIVATE_KEY && 
                              process.env.FIREBASE_CLIENT_EMAIL

let firestoreDb: FirebaseFirestore.Firestore | null = null
let auth: admin.auth.Auth | null = null

if (hasFirebaseAdminConfig) {
  try {
    // Only initialize if not already initialized
    if (getApps().length === 0) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: "https://accounts.google.com/o/oauth2/auth",
        tokenUri: "https://oauth2.googleapis.com/token",
        authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
        clientX509CertUrl: process.env.FIREBASE_CLIENT_CERT_URL
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      })
    }

    firestoreDb = admin.firestore()
    auth = admin.auth()
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
    firestoreDb = null
    auth = null
  }
} else {
  console.log('Firebase Admin environment variables not found. Some features may not work.')
  firestoreDb = null
  auth = null
}

export { firestoreDb, auth, hasFirebaseAdminConfig }