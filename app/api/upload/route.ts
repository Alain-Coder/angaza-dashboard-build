import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import admin from 'firebase-admin'
import { getApps } from 'firebase-admin/app'

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  })
}

const db = admin.firestore()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'uploads'

    console.log('Upload API called with:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      folder: folder
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Log detailed file information
    console.log('Detailed file info:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Convert the file to a buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Create folder directory if it doesn't exist
    const folderDir = path.join(uploadsDir, folder)
    if (!existsSync(folderDir)) {
      await mkdir(folderDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    // Replace spaces and special characters with underscores and ensure URL safety
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${sanitizedFileName}`
    const filePath = path.join(folderDir, fileName)

    console.log('Saving file to:', filePath);

    // Write file to disk
    await writeFile(filePath, buffer)

    // Return the full URL where the file can be accessed
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const url = `${baseUrl}/uploads/${folder}/${fileName}`

    console.log('File uploaded successfully:', { url, fileName, filePath });

    return NextResponse.json({ 
      success: true, 
      url,
      name: file.name,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error') 
    }, { status: 500 })
  }
}
