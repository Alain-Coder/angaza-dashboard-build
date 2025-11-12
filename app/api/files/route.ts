import { NextResponse } from 'next/server'
import admin from 'firebase-admin'
import { getApps } from 'firebase-admin/app'
import { CollectionReference, Query } from 'firebase-admin/firestore'
import { unlink } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

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
    db = admin.firestore()
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
    db = null
  }
} else {
  console.log('Firebase environment variables not found')
}

// Helper function to serialize Firestore data properly
function serializeFirestoreData(data: any) {
  const serialized: any = {}
  
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof admin.firestore.Timestamp) {
      // Serialize timestamp as an object with seconds and nanoseconds
      serialized[key] = {
        seconds: value.seconds,
        nanoseconds: value.nanoseconds
      }
    } else if (value instanceof admin.firestore.GeoPoint) {
      // Serialize GeoPoint
      serialized[key] = {
        latitude: value.latitude,
        longitude: value.longitude
      }
    } else if (value instanceof admin.firestore.DocumentReference) {
      // Serialize DocumentReference as path string
      serialized[key] = value.path
    } else {
      // Keep other values as is
      serialized[key] = value
    }
  }
  
  return serialized
}

// GET - Fetch files and folders for a user
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const userRole = searchParams.get('userRole')
    const folderId = searchParams.get('folderId') || 'root'
    const fetchAll = searchParams.get('fetchAll') === 'true' // Add this line
    
    console.log('Fetching files and folders:', { userId, userRole, folderId, fetchAll })
    
    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Missing user ID or role' },
        { status: 400 }
      )
    }

    try {
      // Fetch files in the specified folder
      // All users, including executive directors, now follow the same logic
      // Create queries for user's own files and shared files
      const userFileQuery = db.collection('files').where('createdBy', '==', userId)
      const sharedFileQuery = db.collection('files').where('sharedWith', 'array-contains', userId)
      
      const userFolderQuery = db.collection('folders').where('createdBy', '==', userId)
      const sharedFolderQuery = db.collection('folders').where('sharedWith', 'array-contains', userId)
      
      // Execute all queries
      const [userFileSnapshot, sharedFileSnapshot, userFolderSnapshot, sharedFolderSnapshot] = await Promise.all([
        userFileQuery.orderBy('createdAt', 'desc').get(),
        sharedFileQuery.orderBy('createdAt', 'desc').get(),
        userFolderQuery.orderBy('createdAt', 'desc').get(),
        sharedFolderQuery.orderBy('createdAt', 'desc').get()
      ])
      
      // Combine results
      const allFileDocs = [...userFileSnapshot.docs, ...sharedFileSnapshot.docs]
      const allFolderDocs = [...userFolderSnapshot.docs, ...sharedFolderSnapshot.docs]
      
      // Remove duplicates (in case a file is both owned and shared)
      const uniqueFileDocs = Array.from(new Map(allFileDocs.map(doc => [doc.id, doc])).values())
      const uniqueFolderDocs = Array.from(new Map(allFolderDocs.map(doc => [doc.id, doc])).values())
      
      // Process files - ensure proper serialization
      const files = uniqueFileDocs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...serializeFirestoreData(data)
        }
      })
      
      // Process folders - ensure proper serialization
      const folders = uniqueFolderDocs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...serializeFirestoreData(data)
        }
      })
      
      // Apply folder filtering to combined results
      let filteredFiles = files;
      let filteredFolders = folders;
      
      if (!fetchAll) {
        if (folderId === 'root') {
          filteredFiles = files.filter(file => (file as any).folderId === null || (file as any).folderId === undefined);
          filteredFolders = folders.filter(folder => (folder as any).parentId === null || (folder as any).parentId === undefined);
        } else {
          filteredFiles = files.filter(file => (file as any).folderId === folderId);
          filteredFolders = folders.filter(folder => (folder as any).parentId === folderId);
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        files: filteredFiles,
        folders: filteredFolders
      })
    } catch (queryError: any) {
      console.error('Query error:', queryError)
      return NextResponse.json(
        { error: 'Database query failed: ' + queryError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch files and folders' },
      { status: 500 }
    )
  }
}

// POST - Create a new file or folder record
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

    const body = await request.json()
    const { 
      name, 
      type, 
      size, 
      path, 
      url, 
      createdBy, 
      creatorName, 
      role,
      folderId = null,
      sharedWith = []
    } = body
    
    console.log('Creating item:', { name, type, folderId })
    
    // Validate required fields
    if (!name || !type || !createdBy || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' }, {
        status: 400
      })
    }

    // Use Firestore server timestamp for consistency
    const createdAt = admin.firestore.FieldValue.serverTimestamp()

    if (type === 'folder') {
      // Create folder document in Firestore
      const folderData = {
        name,
        type,
        createdBy,
        creatorName: creatorName || 'Unknown User',
        role,
        parentId: folderId, // null for root level
        sharedWith: Array.isArray(sharedWith) ? sharedWith : [],
        createdAt,
      }

      const docRef = await db.collection('folders').add(folderData)
      
      // Get the created document to return the actual timestamp value
      const createdDoc = await docRef.get()
      const createdData = createdDoc.data()
      
      console.log('Folder created with ID:', docRef.id)

      return NextResponse.json({ 
        success: true, 
        item: {
          id: docRef.id,
          ...serializeFirestoreData(createdData)
        }
      })
    } else {
      // Create file document in Firestore
      const fileData = {
        name,
        type,
        size: size || null,
        path,
        url: url || null,
        createdBy,
        creatorName: creatorName || 'Unknown User',
        role,
        folderId, // null for root level
        sharedWith: Array.isArray(sharedWith) ? sharedWith : [],
        createdAt,
      }

      const docRef = await db.collection('files').add(fileData)
      
      // Get the created document to return the actual timestamp value
      const createdDoc = await docRef.get()
      const createdData = createdDoc.data()
      
      console.log('File created with ID:', docRef.id)

      return NextResponse.json({ 
        success: true, 
        item: {
          id: docRef.id,
          ...serializeFirestoreData(createdData)
        }
      })
    }
  } catch (error: any) {
    console.error('Error creating file/folder record:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create file/folder record' },
      { status: 500 }
    )
  }
}

// PUT - Update a file/folder record (rename)
export async function PUT(request: Request) {
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

    const { 
      id,
      type,
      newName, 
      userId, 
      userRole 
    } = await request.json()
    
    console.log('Renaming item:', { id, type, newName })
    
    // Validate required fields
    if (!id || !newName || !type) {
      return NextResponse.json(
        { error: 'Missing ID, type, or new name' },
        { status: 400 }
      )
    }

    const collectionName = type === 'folder' ? 'folders' : 'files'
    
    // Check if item exists
    const itemDoc = await db.collection(collectionName).doc(id).get()
    
    if (!itemDoc.exists) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    const itemData = itemDoc.data()
    
    // Check permissions - users can only rename their own items
    // Users with access to shared items cannot rename them
    if (itemData?.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Permission denied - only the owner can rename this item' },
        { status: 403 }
      )
    }

    // Update item name
    await db.collection(collectionName).doc(id).update({
      name: newName
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Item renamed successfully'
    })
  } catch (error: any) {
    console.error('Error renaming item:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to rename item' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a file or folder record
export async function DELETE(request: Request) {
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

    const { id, type, userId, userRole } = await request.json()
    
    console.log('Deleting item:', { id, type })
    
    // Validate required fields
    if (!id || !type) {
      return NextResponse.json(
        { error: 'Missing ID or type' },
        { status: 400 }
      )
    }

    const collectionName = type === 'folder' ? 'folders' : 'files'
    
    // Check if item exists
    const itemDoc = await db.collection(collectionName).doc(id).get()
    
    if (!itemDoc.exists) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    const itemData = itemDoc.data()
    
    // Check permissions - users can only delete their own items
    // Users with access to shared items cannot delete them
    if (itemData?.createdBy !== userId) {
      return NextResponse.json(
        { error: 'Permission denied - only the owner can delete this item' },
        { status: 403 }
      )
    }

    // For files, delete the physical file from local storage
    if (type === 'file' && itemData?.path) {
      try {
        // Convert URL path to file system path
        // URL format: /uploads/{folder}/{filename}
        const filePath = path.join(process.cwd(), 'public', itemData.path);
        
        // Check if file exists before trying to delete
        if (existsSync(filePath)) {
          await unlink(filePath);
          console.log('Physical file deleted successfully:', filePath);
        } else {
          console.log('Physical file not found:', filePath);
        }
      } catch (fileError) {
        console.error('Error deleting physical file:', fileError);
        // Don't fail the entire operation if we can't delete the physical file
        // The database record is still deleted
      }
    }

    // For folders, we need to delete all contents recursively
    if (type === 'folder') {
      try {
        // Delete all contents of the folder recursively
        await deleteFolderRecursively(id, userId);
      } catch (folderError) {
        console.error('Error deleting folder contents:', folderError);
        // Continue with folder deletion even if we can't delete all contents
      }
    }

    // Delete item document from Firestore
    await db.collection(collectionName).doc(id).delete()
    console.log('Item deleted successfully:', id)

    return NextResponse.json({ 
      success: true, 
      message: 'Item deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete item' },
      { status: 500 }
    )
  }
}

// PATCH - Update sharing access for a file or folder
export async function PATCH(request: Request) {
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

    const { 
      id,
      type,
      sharedWith,
      userId,
      action, // New parameter to specify the action
      recursive = false // New parameter to enable recursive sharing
    } = await request.json()
    
    console.log('Updating sharing access:', { id, type, sharedWith, action, recursive })
    
    // Validate required fields
    if (!id || !type) {
      return NextResponse.json(
        { error: 'Missing ID or type' },
        { status: 400 }
      )
    }

    const collectionName = type === 'folder' ? 'folders' : 'files'
    
    // Check if item exists
    const itemDoc = await db.collection(collectionName).doc(id).get()
    
    if (!itemDoc.exists) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    const itemData = itemDoc.data()
    
    // Handle different actions
    if (action === 'remove_self') {
      // Users can remove themselves from shared items
      if (!Array.isArray(itemData?.sharedWith) || !itemData.sharedWith.includes(userId)) {
        return NextResponse.json(
          { error: 'You do not have access to this item' },
          { status: 403 }
        )
      }
      
      // Remove the user from the sharedWith array
      const updatedSharedWith = itemData.sharedWith.filter((id: string) => id !== userId)
      
      await db.collection(collectionName).doc(id).update({
        sharedWith: updatedSharedWith
      })
      
      return NextResponse.json({ 
        success: true, 
        message: 'Item removed from your shared files successfully'
      })
    } else {
      // Default behavior: only owners can modify sharing access
      if (itemData?.createdBy !== userId) {
        return NextResponse.json(
          { error: 'Permission denied - only the owner can modify sharing access' },
          { status: 403 }
        )
      }
      
      // Validate sharedWith array for owner actions
      if (!Array.isArray(sharedWith)) {
        return NextResponse.json(
          { error: 'sharedWith must be an array' },
          { status: 400 }
        )
      }
      
      // Update sharing access for the item itself
      await db.collection(collectionName).doc(id).update({
        sharedWith
      })
      
      // If recursive sharing is enabled and this is a folder, share all contents
      if (recursive && type === 'folder') {
        await shareFolderContentsRecursively(id, sharedWith, userId)
      } 
      
      return NextResponse.json({ 
        success: true, 
        message: recursive && type === 'folder' 
          ? 'Folder and all its contents shared successfully' 
          : 'Sharing access updated successfully'
      })
    }
  } catch (error: any) {
    console.error('Error updating sharing access:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update sharing access' },
      { status: 500 }
    )
  }
}

// Helper function to recursively delete folder contents
async function deleteFolderRecursively(folderId: string, userId: string) {
  try {
    // Add null check for db
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Delete all files in this folder
    const filesInFolder = await db.collection('files')
      .where('folderId', '==', folderId)
      .where('createdBy', '==', userId)
      .get();
    
    // Delete all subfolders in this folder
    const subfoldersInFolder = await db.collection('folders')
      .where('parentId', '==', folderId)
      .where('createdBy', '==', userId)
      .get();
    
    // Delete all files physically and from database
    for (const doc of filesInFolder.docs) {
      const fileData = doc.data();
      // Delete physical file
      if (fileData?.path) {
        try {
          const filePath = path.join(process.cwd(), 'public', fileData.path);
          if (existsSync(filePath)) {
            await unlink(filePath);
            console.log('Physical file deleted successfully:', filePath);
          }
        } catch (fileError) {
          console.error('Error deleting physical file:', fileError);
        }
      }
      // Delete database record
      await db.collection('files').doc(doc.id).delete();
    }
    
    // Recursively delete subfolders
    for (const doc of subfoldersInFolder.docs) {
      // Make recursive call to delete subfolder and its contents
      await deleteFolderRecursively(doc.id, userId);
    }
    
    // Delete the folder itself
    await db.collection('folders').doc(folderId).delete();
  } catch (error) {
    console.error('Error deleting folder recursively:', error);
    throw error;
  }
}

// Helper function to recursively share folder contents
async function shareFolderContentsRecursively(folderId: string, sharedWith: string[], userId: string) {
  try {
    // Add null check for db
    if (!db) {
      throw new Error('Database not initialized');
    }
    
    // Share all files in this folder
    const filesInFolder = await db.collection('files')
      .where('folderId', '==', folderId)
      .where('createdBy', '==', userId)
      .get()
    
    // Share all subfolders in this folder
    const foldersInFolder = await db.collection('folders')
      .where('parentId', '==', folderId)
      .where('createdBy', '==', userId)
      .get()
    
    // Update all files in this folder
    const fileUpdatePromises = filesInFolder.docs.map(doc => {
      const fileData = doc.data()
      // Merge existing sharedWith with new sharedWith, avoiding duplicates
      const updatedSharedWith = Array.from(new Set([
        ...(fileData.sharedWith || []), 
        ...sharedWith
      ]))
      
      return db.collection('files').doc(doc.id).update({
        sharedWith: updatedSharedWith
      })
    })
    
    // Update all subfolders in this folder
    const folderUpdatePromises = foldersInFolder.docs.map(async doc => {
      const folderData = doc.data()
      // Merge existing sharedWith with new sharedWith, avoiding duplicates
      const updatedSharedWith = Array.from(new Set([
        ...(folderData.sharedWith || []), 
        ...sharedWith
      ]))
      
      await db.collection('folders').doc(doc.id).update({
        sharedWith: updatedSharedWith
      })
      
      // Recursively share contents of this subfolder
      return shareFolderContentsRecursively(doc.id, sharedWith, userId)
    })
    
    // Execute all updates
    await Promise.all([...fileUpdatePromises, ...folderUpdatePromises])
  } catch (error) {
    console.error('Error sharing folder contents recursively:', error)
    throw error
  }
}