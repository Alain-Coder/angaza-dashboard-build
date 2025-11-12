import { toast } from 'sonner'

export interface UploadResult {
  url: string
  name: string
  size: number
  type: string
}

/**
 * Upload a file to the public/uploads directory
 * @param file The file to upload
 * @param folder The folder to upload to (e.g. 'receipts', 'documents')
 * @returns Promise with upload result or null if failed
 */
export async function uploadFile(file: File, folder: string = 'uploads'): Promise<UploadResult | null> {
  try {
    console.log('Starting file upload:', { fileName: file.name, fileSize: file.size, fileType: file.type, folder });
    
    // Validate file
    if (!file) {
      throw new Error('No file provided')
    }

    // Log file details for debugging
    console.log('File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Create FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)

    // Send to API endpoint
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    console.log('Upload response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upload failed with status:', response.status, 'Response:', errorText);
      throw new Error(`Upload failed with status ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('Upload API response:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed')
    }

    // Validate that we have a URL
    if (!result.url) {
      throw new Error('Upload succeeded but no URL was returned')
    }

    console.log('File upload successful, returning result:', result);
    
    return {
      url: result.url,
      name: result.name,
      size: result.size,
      type: result.type
    }
  } catch (error) {
    console.error('File upload error:', error)
    toast.error('Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error'))
    return null
  }
}

/**
 * Validate a file before upload
 * @param file The file to validate
 * @param maxSize Maximum file size in bytes (default 5MB)
 * @param allowedTypes Allowed MIME types (default images and PDFs)
 * @returns Boolean indicating if file is valid
 */
export function validateFile(
  file: File, 
  maxSize: number = 5 * 1024 * 1024, // 5MB
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
): boolean {
  // Check file size
  if (file.size > maxSize) {
    toast.error(`File size must be less than ${maxSize / (1024 * 1024)}MB`)
    return false
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    toast.error('Please upload a valid image (JPEG, PNG, GIF) or PDF file')
    return false
  }

  return true
}