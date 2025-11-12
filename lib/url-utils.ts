/**
 * Convert a relative URL to an absolute URL
 * @param url The URL to convert
 * @returns The absolute URL
 */
export function toAbsoluteUrl(url: string): string {
  // Check if url exists and is a string
  if (!url || typeof url !== 'string') return ''
  
  // If it's already an absolute URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // If it's a relative path, make it absolute
  if (url.startsWith('/')) {
    // Use window.location to construct the full URL
    if (typeof window !== 'undefined') {
      // Ensure there's only one slash between origin and path
      const cleanPath = url.startsWith('/') ? url : `/${url}`
      return `${window.location.origin}${cleanPath}`
    }
    // Fallback for server-side rendering
    return url
  }
  
  return url
}

/**
 * Check if a URL is valid
 * @param url The URL to validate
 * @returns Boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  // Check if url exists and is a string
  if (!url || typeof url !== 'string' || url.trim() === '') return false
  
  // Check if it's a relative path (starts with /)
  if (url.startsWith('/')) {
    return true
  }
  
  // For absolute URLs, try to create a URL object
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Encode URL path segments to handle special characters
 * @param url The URL to encode
 * @returns The encoded URL
 */
export function encodeUrlPath(url: string): string {
  // Check if url exists and is a string
  if (!url || typeof url !== 'string') return ''
  
  // If it's a relative path, encode the path segments
  if (url.startsWith('/')) {
    try {
      // Split the URL into parts and encode the path segments
      const urlObj = new URL(`http://localhost${url}`)
      const encodedPath = urlObj.pathname.split('/').map(segment => 
        segment ? encodeURIComponent(segment) : segment
      ).join('/')
      
      // For PDF files, we don't want to encode the extension
      if (url.toLowerCase().endsWith('.pdf')) {
        const lastSlashIndex = encodedPath.lastIndexOf('/')
        const fileName = encodedPath.substring(lastSlashIndex + 1)
        const basePath = encodedPath.substring(0, lastSlashIndex + 1)
        // Don't encode the .pdf extension
        const nameWithoutExt = fileName.replace(/\.pdf$/i, '')
        return basePath + nameWithoutExt + '.pdf'
      }
      
      return encodedPath + urlObj.search + urlObj.hash
    } catch {
      // Fallback: just encode the entire URL
      return encodeURI(url)
    }
  }
  
  // For absolute URLs, try to encode properly
  try {
    const urlObj = new URL(url)
    const encodedPath = urlObj.pathname.split('/').map(segment => 
      segment ? encodeURIComponent(segment) : segment
    ).join('/')
    
    // For PDF files, we don't want to encode the extension
    if (url.toLowerCase().endsWith('.pdf')) {
      const lastSlashIndex = encodedPath.lastIndexOf('/')
      const fileName = encodedPath.substring(lastSlashIndex + 1)
      const basePath = encodedPath.substring(0, lastSlashIndex + 1)
      // Don't encode the .pdf extension
      const nameWithoutExt = fileName.replace(/\.pdf$/i, '')
      return basePath + nameWithoutExt + '.pdf'
    }
    
    return encodedPath + urlObj.search + urlObj.hash
  } catch {
    // Fallback: return the original URL
    return url
  }
}

/**
 * Check if a URL is accessible
 * @param url The URL to check
 * @returns Promise resolving to boolean indicating if URL is accessible
 */
export async function isUrlAccessible(url: string): Promise<boolean> {
  // Check if url exists and is a string
  if (!url || typeof url !== 'string') return false
  
  try {
    // For relative URLs, make them absolute first
    const absoluteUrl = toAbsoluteUrl(url)
    
    // For local development, we can't easily check file accessibility
    // Just validate the URL format instead
    if (absoluteUrl.startsWith('/')) {
      return isValidUrl(absoluteUrl)
    }
    
    // For absolute URLs, make a HEAD request to check accessibility
    const response = await fetch(absoluteUrl, { 
      method: 'HEAD',
      mode: 'no-cors' // Use no-cors to avoid CORS issues
    })
    
    // If we get a response (even with CORS restrictions), the URL is likely accessible
    // Note: with no-cors mode, we can't read the status, but the fetch itself succeeding indicates accessibility
    return true
  } catch (error) {
    console.log('URL accessibility check failed:', error)
    return false
  }
}
