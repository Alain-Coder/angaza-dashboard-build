// scripts/init-departments.js
const admin = require('firebase-admin')
const dotenv = require('dotenv')

// Load environment variables
dotenv.config()

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

const db = admin.firestore()

async function createDefaultDepartments() {
  try {
    // Define default departments
    const defaultDepartments = [
      {
        code: 'PROG',
        name: 'Programs Department',
        description: 'Responsible for program development and implementation'
      },
      {
        code: 'FIN',
        name: 'Finance Department',
        description: 'Manages financial operations and budgeting'
      },
      {
        code: 'ADMIN',
        name: 'Administration Department',
        description: 'Handles administrative and operational tasks'
      },
      {
        code: 'OUTR',
        name: 'Community Outreach Department',
        description: 'Manages community engagement and outreach programs'
      },
      {
        code: 'M&E',
        name: 'Monitoring & Evaluation Department',
        description: 'Tracks and evaluates program effectiveness'
      }
    ]

    // Create each department in Firestore
    for (const department of defaultDepartments) {
      // Check if department already exists
      const existingDept = await db.collection('departments')
        .where('code', '==', department.code)
        .limit(1)
        .get()

      if (existingDept.empty) {
        // Create the department
        const docRef = await db.collection('departments').add({
          ...department,
          createdAt: new Date()
        })
        console.log(`Created department: ${department.name} with ID: ${docRef.id}`)
      } else {
        console.log(`Department ${department.name} already exists`)
      }
    }

    console.log('Department initialization completed')
  } catch (error) {
    console.log('Error creating default departments:', error)
  }
}

createDefaultDepartments()