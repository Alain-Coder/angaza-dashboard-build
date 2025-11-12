'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon, FileText, Download, X } from 'lucide-react'
import { toast } from 'sonner'
import { toAbsoluteUrl, isValidUrl, encodeUrlPath, isUrlAccessible } from '@/lib/url-utils'

interface ReceiptViewerProps {
  fileUrl: string
  fileName: string
  fileType: string
  isOpen: boolean
  onClose: () => void
}

export function ReceiptViewer({ fileUrl, fileName, fileType, isOpen, onClose }: ReceiptViewerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlAccessible, setUrlAccessible] = useState<boolean>(true)

  console.log('ReceiptViewer props:', { fileUrl, fileName, fileType, isOpen });

  // Better file type detection
  const isImage = (fileType && typeof fileType === 'string' && fileType.startsWith('image/')) || 
                  (fileUrl && typeof fileUrl === 'string' && fileUrl.match && fileUrl.match(/\.(jpg|jpeg|png|gif)$/i) !== null)
  const isPdf = (fileType && typeof fileType === 'string' && fileType === 'application/pdf') || 
                (fileUrl && typeof fileUrl === 'string' && fileUrl.match && fileUrl.match(/\.pdf$/i) !== null)

  console.log('File type detection:', { isImage, isPdf, fileType, fileUrl });

  // Check if URL is accessible
  useEffect(() => {
    if (fileUrl && isOpen) {
      const checkUrl = async () => {
        const accessible = await isUrlAccessible(fileUrl)
        setUrlAccessible(accessible)
        if (!accessible) {
          setError('File not found or inaccessible')
        }
      }
      checkUrl()
    }
  }, [fileUrl, isOpen])

  // Reset error when fileUrl changes
  useEffect(() => {
    setError(null)
    setLoading(true)
  }, [fileUrl])

  const handleDownload = () => {
    try {
      // Check if URL is accessible first
      if (!urlAccessible) {
        toast.error('File not found or inaccessible')
        return
      }
      
      // Create a temporary anchor element
      const absoluteUrl = toAbsoluteUrl(fileUrl)
      const encodedUrl = encodeUrlPath(absoluteUrl)
      
      const link = document.createElement('a')
      link.href = encodedUrl
      link.download = fileName || 'receipt'
      link.target = '_blank'
      
      // Append to the body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to access file. Please try again.')
    }
  }

  const handleImageLoad = () => {
    console.log('Image loaded successfully');
    setLoading(false)
  }

  const handleImageError = () => {
    console.log('Image failed to load');
    setError('Failed to load image. The file may not exist or you may not have permission to view it.')
    setLoading(false)
    toast.error('Failed to load image')
  }

  if (!isOpen || !fileUrl) {
    console.log('ReceiptViewer not open or no fileUrl');
    return null
  }

  // Validate the URL
  if (!isValidUrl(fileUrl)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Invalid File
              </DialogTitle>
              <DialogDescription>File URL Error</DialogDescription>
            </div>
            <Button variant="ghost" className='cursor-pointer' size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Invalid File URL</h3>
            <p className="text-muted-foreground mb-4">The file URL is invalid or missing.</p>
            <p className="text-sm text-muted-foreground mb-4 break-all">{fileUrl}</p>
            <Button className='cursor-pointer' onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const absoluteUrl = toAbsoluteUrl(fileUrl)
  const encodedUrl = encodeUrlPath(absoluteUrl)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center">
              {isImage ? (
                <ImageIcon className="w-5 h-5 mr-2" />
              ) : (
                <FileText className="w-5 h-5 mr-2" />
              )}
              {fileName || 'Receipt'}
            </DialogTitle>
            <DialogDescription>
              {isImage ? 'Image receipt' : isPdf ? 'PDF receipt' : 'Receipt document'}
            </DialogDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" className='cursor-pointer hover:text-foreground' size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" className='cursor-pointer' size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="mt-4 flex justify-center items-center h-[70vh] bg-muted/10 rounded-lg overflow-hidden">
          {!urlAccessible ? (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">File Not Accessible</h3>
              <p className="text-muted-foreground mb-4">The file could not be found or accessed.</p>
              <p className="text-sm text-muted-foreground mb-4 break-all">{absoluteUrl}</p>
              <Button className='cursor-pointer' onClick={onClose}>
                Close
              </Button>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Error Loading File</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="flex space-x-2">
                <Button className='cursor-pointer' onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Try Download
                </Button>
                <Button variant="outline" className='cursor-pointer' onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : isImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              <img 
                src={encodedUrl} 
                alt={fileName || 'Receipt'} 
                className={`max-w-full max-h-full object-contain ${loading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          ) : isPdf ? (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">PDF Document</h3>
              <p className="text-muted-foreground mb-4">PDF receipts are ready for download</p>
              <Button className='cursor-pointer' onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Document</h3>
              <p className="text-muted-foreground mb-4">This file type is ready for download</p>
              <Button className='cursor-pointer' onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                {isPdf ? 'Download PDF' : 'Download File'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}