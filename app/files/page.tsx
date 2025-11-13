'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { RoleBasedLayout } from '@/components/role-based-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  FileText, 
  Folder, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  FileIcon,
  FolderOpen,
  Users,
  Grid,
  List,
  MoreHorizontal,
  Edit,
  AlertCircle,
  Info,
  Share2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { MultiSelect } from "@/components/ui/multi-select"
import { createPortal } from 'react-dom'

interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  createdAt: Date | { seconds: number; nanoseconds: number } | string
  createdBy: string
  creatorName: string
  role: string
  path?: string
  url?: string
  folderId: string | null
  sharedWith?: string[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

// Helper function to convert Firestore timestamp to Date
const convertToDate = (dateValue: Date | { seconds: number; nanoseconds: number } | string | undefined): Date => {
  console.log('Converting date value:', dateValue, typeof dateValue)
  
  if (!dateValue) {
    console.log('No date value provided, returning current date')
    return new Date()
  }
  
  if (dateValue instanceof Date) {
    console.log('Date value is already a Date object:', dateValue)
    return dateValue
  }
  
  if (typeof dateValue === 'string') {
    console.log('Date value is a string:', dateValue)
    const date = new Date(dateValue)
    const isValid = !isNaN(date.getTime())
    console.log('Parsed date from string:', date, 'is valid:', isValid)
    return isValid ? date : new Date()
  }
  
  if (typeof dateValue === 'object' && 'seconds' in dateValue) {
    // Handle Firestore Timestamp objects properly
    const timestamp = dateValue as { seconds: number; nanoseconds: number }
    console.log('Date value is Firestore timestamp:', timestamp)
    // Convert seconds to milliseconds and add nanoseconds converted to milliseconds
    const date = new Date(timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000))
    console.log('Converted Firestore timestamp to Date:', date)
    return date
  }
  
  console.log('Unknown date format, returning current date')
  return new Date()
}

// Helper function to format date safely
const formatDateSafely = (dateValue: Date | { seconds: number; nanoseconds: number } | string | undefined): string => {
  try {
    const date = convertToDate(dateValue)
    return format(date, 'MMM d, yyyy')
  } catch (error) {
    return 'Unknown date'
  }
}

// Helper function to format date with time
const formatDateTimeSafely = (dateValue: Date | { seconds: number; nanoseconds: number } | string | undefined): string => {
  try {
    const date = convertToDate(dateValue)
    return format(date, 'MMM d, yyyy h:mm a')
  } catch (error) {
    return 'Unknown date'
  }
}

export default function FilesPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<FileItem[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<Array<{id: string, name: string}>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [renamingItem, setRenamingItem] = useState<{id: string, name: string, type: 'file' | 'folder'} | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null)
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false)
  const [inlineRenameId, setInlineRenameId] = useState<string | null>(null)
  const [inlineRenameValue, setInlineRenameValue] = useState('')
  const [allItems, setAllItems] = useState<FileItem[]>([])
  const [showSharedTab, setShowSharedTab] = useState(false)
  const [sharedItems, setSharedItems] = useState<FileItem[]>([])
  const [allSharedItems, setAllSharedItems] = useState<FileItem[]>([])
  const [isSharingDialogOpen, setIsSharingDialogOpen] = useState(false)
  const [sharingItem, setSharingItem] = useState<FileItem | null>(null)
  const [sharingUsers, setSharingUsers] = useState<string[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'file' | 'folder'} | null>(null)
  const [searchTerm, setSearchTerm] = useState('') // Add search term state
  
  // Cache for folder contents to avoid loading state on navigation
  const [folderCache, setFolderCache] = useState<Record<string, FileItem[]>>({})
  console.log('Initial folder cache:', folderCache)
  
  // Add CSS to handle dropdown positioning
  useEffect(() => {
    // Add CSS to handle dropdown overflow
    const style = document.createElement('style')
    style.textContent = `
      .file-table-container {
        overflow: visible !important;
      }
      .file-table-container table {
        overflow: visible !important;
      }
      .file-table-container td {
        overflow: visible !important;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])
  
  // Fetch shared items
  const fetchSharedItems = useCallback(async (folderId: string | null = null) => {
    if (!user) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // For shared items, we always fetch all items and filter on the client side
      // This ensures we get all shared files regardless of folder structure
      const response = await fetch(`/api/files?userId=${user.uid}&userRole=${user.role || ''}&fetchAll=true`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to fetch shared files')
      
      // Debug: Log the raw API response to see timestamp values
      console.log('Raw API response for shared items:', result)
      
      // Combine files and folders
      // For shared tab, we show only items explicitly shared with the user
      const allItems: FileItem[] = [
        ...(result.folders || []).map((folder: any) => {
          console.log('Shared folder timestamp:', folder.createdAt)
          return ({
            ...folder,
            folderId: folder.parentId || null,
            type: 'folder',
            createdAt: folder.createdAt
          })
        }),
        ...(result.files || []).map((file: any) => {
          console.log('Shared file timestamp:', file.createdAt)
          return ({
            ...file,
            folderId: file.folderId || null,
            type: 'file',
            createdAt: file.createdAt
          })
        })
      ]
      
      // Filter items for the Shared With Me tab
      // In this tab, we show:
      // 1. Items explicitly shared with the user (at root level)
      // 2. When inside a shared folder, all contents of that folder
      
      let filteredSharedItems: FileItem[] = [];
      
      if (folderId) {
        // When navigating into a specific folder, show all items in that folder
        // This works because if the user can access the folder, they can access its contents
        filteredSharedItems = allItems.filter(item => item.folderId === folderId);
      } else {
        // For root level, show only items explicitly shared with user
        // Show only root-level shared items (items with no parent folderId)
        // This prevents nested items from appearing at the root level
        filteredSharedItems = allItems.filter(item => 
          Array.isArray(item.sharedWith) && item.sharedWith.includes(user.uid)
        ).filter(item => {
          // Show only items at root level (no parent folder)
          return item.folderId === null || item.folderId === undefined;
        })
      }
      
      setSharedItems(filteredSharedItems);
      setAllSharedItems(allItems);
      

    } catch (error: any) {
      console.error('Error fetching shared files:', error)
      setError(error.message || 'Failed to load shared files and folders')
      setTimeout(() => {
        toast.error('Failed to load shared files and folders: ' + (error.message || 'Unknown error'), {
          style: {
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }
        })
      }, 0)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Fetch all items for size calculation
  const fetchAllItems = useCallback(async () => {
    if (!user) return
    
    try {
      // Fetch all items for the user (no folderId filter)
      const response = await fetch(`/api/files?userId=${user.uid}&userRole=${user.role || ''}&fetchAll=true`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to fetch all files')
      
      // Combine files and folders
      // When items are returned from API, folders have parentId and files have folderId
      // We'll normalize this to use folderId internally for both
      // Filter to show only items owned by the user (not shared items)
      const allItems: FileItem[] = [
        ...(result.folders || []).map((folder: any) => ({
          ...folder,
          folderId: folder.parentId || null, // Folders have parentId, map to folderId
          type: 'folder',
          createdAt: folder.createdAt
        })),
        ...(result.files || []).map((file: any) => ({
          ...file,
          folderId: file.folderId || null, // Files already have folderId
          type: 'file',
          createdAt: file.createdAt
        }))
      ].filter(item => item.createdBy === user.uid)
      
      setAllItems(allItems)
    } catch (error: any) {
      console.error('Error fetching all files:', error)
    }
  }, [user])

  // Fetch items based on current folder (for display)
  const fetchItems = useCallback(async (folderId: string | null = currentFolderId) => {
    if (!user) return
    
    // Check if we have cached items for this folder
    const cacheKey = folderId || 'root'
    if (folderCache[cacheKey]) {
      console.log(`Using cached items for folder: ${cacheKey}`)
      setItems(folderCache[cacheKey])
      return
    }
    
    console.log(`Fetching items from API for folder: ${cacheKey}`)
    setIsLoading(true)
    setError(null)
    try {
      // For root folder, we send folderId=root to the API
      // For subfolders, we send the actual folder ID
      const folderIdParam = folderId ? `&folderId=${folderId}` : '&folderId=root'
      const response = await fetch(`/api/files?userId=${user.uid}&userRole=${user.role || ''}${folderIdParam}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to fetch files')
      
      // Debug: Log the raw API response to see timestamp values
      console.log('Raw API response:', result)
      
      // Combine files and folders
      // When items are returned from API, folders have parentId and files have folderId
      // We'll normalize this to use folderId internally for both
      // Filter to show only items owned by the user (not shared items)
      const folderItems: FileItem[] = [
        ...(result.folders || []).map((folder: any) => ({
          ...folder,
          folderId: folder.parentId || null, // Folders have parentId, map to folderId
          type: 'folder',
          createdAt: folder.createdAt
        })),
        ...(result.files || []).map((file: any) => ({
          ...file,
          folderId: file.folderId || null, // Files already have folderId
          type: 'file',
          createdAt: file.createdAt
        }))
      ].filter(item => item.createdBy === user.uid)
      
      console.log(`Caching items for folder: ${cacheKey}`, folderItems)
      // Cache the items for this folder
      setFolderCache(prev => {
        const newCache = { ...prev, [cacheKey]: folderItems }
        console.log('Updated folder cache:', newCache)
        return newCache
      })
      setItems(folderItems)
    } catch (error: any) {
      console.error('Error fetching files:', error)
      setError(error.message || 'Failed to load files and folders')
      setTimeout(() => {
        toast.error('Failed to load files and folders: ' + (error.message || 'Unknown error'), {
          style: {
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }
        })
      }, 0)
    } finally {
      setIsLoading(false)
    }
  }, [user, currentFolderId])
  
  // Filter items based on search term
  const filterItemsBySearch = useCallback((items: FileItem[], term: string) => {
    if (!term) return items
    const lowercasedTerm = term.toLowerCase()
    return items.filter(item => 
      item.name.toLowerCase().includes(lowercasedTerm)
    )
  }, [])
  
  // Get filtered items for display
  const getFilteredItems = useCallback(() => {
    return filterItemsBySearch(items, searchTerm)
  }, [items, searchTerm, filterItemsBySearch])
  
  // Get filtered shared items for display
  const getFilteredSharedItems = useCallback(() => {
    return filterItemsBySearch(sharedItems, searchTerm)
  }, [sharedItems, searchTerm, filterItemsBySearch])
  
  // Fetch all users for sharing dropdown
  const fetchAllUsers = useCallback(async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/users/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentUserId: user.uid })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to fetch users')
      
      setAllUsers(result.users)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users for sharing: ' + (error.message || 'Unknown error'), {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    }
  }, [user])

  useEffect(() => {
    // Clear cache when user changes
    setFolderCache({})
    fetchItems()
    fetchAllItems() // Also fetch all items for size calculation
    fetchAllUsers() // Fetch all users for sharing
  }, [user, currentFolderId, fetchItems, fetchAllItems, fetchAllUsers]) // Add fetch functions to dependencies

  // Navigate to a specific path
  const navigateToPath = (index: number) => {
    const newFolderPath = folderPath.slice(0, index + 1)
    setFolderPath(newFolderPath)
    const newFolderId = newFolderPath.length > 0 ? newFolderPath[newFolderPath.length - 1].id : null
    setCurrentFolderId(newFolderId)
    // Clear cache when navigating to ensure fresh data
    setFolderCache({})
    // Use appropriate fetch function based on current tab
    if (showSharedTab) {
      fetchSharedItems(newFolderId) // Fetch shared items for the new folder
    } else {
      fetchItems(newFolderId) // Fetch items for the new folder
    }
  }

  // Navigate to root
  const navigateToRoot = () => {
    setFolderPath([])
    setCurrentFolderId(null)
    // Clear cache when navigating to ensure fresh data
    setFolderCache({})
    // Use appropriate fetch function based on current tab
    if (showSharedTab) {
      fetchSharedItems(null) // Fetch shared items for root
    } else {
      fetchItems(null) // Fetch items for root
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      const folderPathStr = folderPath.map(f => f.name).join('/')
      const folderParam = folderPathStr ? folderPathStr : 'uploads'
      formData.append('file', file)
      formData.append('folder', folderParam)
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!uploadResponse.ok) throw new Error('Upload failed')
      
      const uploadResult = await uploadResponse.json()
      if (!uploadResult.success) throw new Error(uploadResult.error || 'Upload failed')
      
      const fileRecordResponse = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: file.name,
          type: 'file',
          size: file.size,
          path: uploadResult.url,
          url: uploadResult.url,
          createdBy: user.uid,
          creatorName: user.displayName || user.email || 'User',
          role: user.role || 'user',
          folderId: currentFolderId
          // Removed sharedWith - sharing is now done after creation
        })
      })
      
      if (!fileRecordResponse.ok) {
        const errorData = await fileRecordResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${fileRecordResponse.status}: ${fileRecordResponse.statusText}`)
      }
      
      const fileRecordResult = await fileRecordResponse.json()
      if (!fileRecordResult.success) throw new Error(fileRecordResult.error || 'Failed to save file record')
      
      const newFile: FileItem = {
        ...fileRecordResult.item,
        type: 'file',
        createdAt: fileRecordResult.item.createdAt
      }
      
      setItems(prev => [newFile, ...prev])
      toast.success('File uploaded successfully', {
        style: {
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file: ' + (error.message || 'Unknown error'), {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          type: 'folder',
          createdBy: user.uid,
          creatorName: user.displayName || user.email || 'User',
          role: user.role || 'user',
          folderId: currentFolderId
          // Removed sharedWith - sharing is now done after creation
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to create folder')
      
      const newFolder: FileItem = {
        ...result.item,
        type: 'folder',
        createdAt: result.item.createdAt
      }
      
      setItems(prev => [newFolder, ...prev])
      setNewFolderName('')
      setIsCreatingFolder(false)
      toast.success('Folder created successfully', {
        style: {
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
    } catch (error: any) {
      console.error('Folder creation error:', error)
      toast.error('Failed to create folder: ' + (error.message || 'Unknown error'), {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    }
  }

  // Update the handleDeleteItem function to open the confirmation dialog
  const handleDeleteItem = (id: string, name: string, type: 'file' | 'folder') => {
    setItemToDelete({ id, name, type })
    setIsDeleteDialogOpen(true)
  }

  // Add the actual delete function
  const confirmDeleteItem = async () => {
    if (!itemToDelete || !user) return
    
    try {
      const response = await fetch('/api/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: itemToDelete.id,
          type: itemToDelete.type,
          userId: user.uid,
          userRole: user.role || 'user'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to delete item')
      
      setItems(prev => prev.filter(item => item.id !== itemToDelete.id))
      toast.success(`${itemToDelete.type === 'folder' ? 'Folder' : 'File'} deleted successfully`, {
        style: {
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(`Failed to delete ${itemToDelete.type === 'folder' ? 'folder' : 'file'}: ` + (error.message || 'Unknown error'), {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const startRenaming = (id: string, name: string, type: 'file' | 'folder') => {
    setRenamingItem({ id, name, type })
    setRenameValue(name)
  }

  const handleRename = async () => {
    if (!renamingItem || !user) return

    try {
      const response = await fetch('/api/files', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: renamingItem.id,
          type: renamingItem.type,
          newName: renameValue,
          userId: user.uid,
          userRole: user.role || 'user'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to rename item')
      
      setItems(prev => prev.map(item => 
        item.id === renamingItem.id ? {...item, name: renameValue} : item
      ))
      
      setRenamingItem(null)
      setRenameValue('')
      toast.success('Item renamed successfully', {
        style: {
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
    } catch (error: any) {
      console.error('Rename error:', error)
      toast.error('Failed to rename item: ' + (error.message || 'Unknown error'), {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    }
  }

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShowProperties = (item: FileItem) => {
    setSelectedItem(item)
    setIsPropertiesOpen(true)
  }

  // Navigate to a folder or preview a file
  const handleItemClick = (item: FileItem) => {
    if (item.type === 'folder') {
      setFolderPath(prev => [...prev, {id: item.id, name: item.name}])
      setCurrentFolderId(item.id)
      // Clear cache when navigating to ensure fresh data
      setFolderCache({})
      // Use appropriate fetch function based on current tab
      if (showSharedTab) {
        fetchSharedItems(item.id) // Fetch shared items for the new folder
      } else {
        fetchItems(item.id) // Fetch items for the new folder
      }
    } else if (item.url) {
      window.open(item.url, '_blank')
    }
  }

  // Start inline renaming
  const startInlineRename = (item: FileItem) => {
    setInlineRenameId(item.id)
    setInlineRenameValue(item.name)
  }

  // Handle inline rename
  const handleInlineRename = async (item: FileItem) => {
    if (!inlineRenameValue.trim() || !user) return

    if (inlineRenameValue !== item.name) {
      try {
        const response = await fetch('/api/files', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: item.id,
            type: item.type,
            newName: inlineRenameValue,
            userId: user.uid,
            userRole: user.role || 'user'
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Failed to rename item')
        
        // Update the item in state
        setItems(prev => prev.map(i => 
          i.id === item.id ? {...i, name: inlineRenameValue} : i
        ))
      } catch (error: any) {
        console.error('Rename error:', error)
        toast.error('Failed to rename item: ' + (error.message || 'Unknown error'), {
          style: {
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca'
          }
        })
      }
    }
    
    setInlineRenameId(null)
    setInlineRenameValue('')
  }

  // Handle item click with rename prevention
  const handleItemContainerClick = (e: React.MouseEvent, item: FileItem) => {
    // Prevent navigation if we're in rename mode
    if (inlineRenameId === item.id) {
      e.stopPropagation()
      return
    }
    
    handleItemClick(item)
  }

  // Handle double click for renaming with proper event handling
  const handleItemContainerDoubleClick = (e: React.MouseEvent, item: FileItem) => {
    e.stopPropagation()
    startInlineRename(item)
  }

  const formatFileSize = (bytes: number = 0) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Calculate total size of folder including all subfolders and files
  const calculateFolderSize = (folderId: string, allItems: FileItem[]): number => {
    let totalSize = 0
    
    // Get all direct children (files and folders) of this folder
    const directChildren = allItems.filter(item => {
      // Handle root folder case - when we're looking for root folder items
      // Root items have folderId as null or undefined
      if (folderId === 'root' || folderId === null || folderId === undefined) {
        return item.folderId === null || item.folderId === undefined;
      }
      // For regular folders, match folderId directly
      return item.folderId === folderId;
    });
    
    // Add size of direct file children
    const files = directChildren.filter(item => item.type === 'file');
    files.forEach(file => {
      totalSize += file.size || 0;
    });
    
    // Recursively add size of subfolders
    const subfolders = directChildren.filter(item => item.type === 'folder');
    subfolders.forEach(subfolder => {
      totalSize += calculateFolderSize(subfolder.id, allItems);
    });
    
    return totalSize;
  }

  // Get display size for an item (files show their size, folders show calculated size)
  const getItemDisplaySize = (item: FileItem): string => {
    if (item.type === 'file') {
      return item.size ? formatFileSize(item.size) : '0 Bytes';
    } else {
      // For folders, calculate total size of all contents
      // Use different item sets based on which tab we're in
      const itemsToUse = showSharedTab ? allSharedItems : allItems;
      const folderSize = calculateFolderSize(item.id, itemsToUse);
      return folderSize > 0 ? formatFileSize(folderSize) : '0 Bytes';
    }
  }

  // Open sharing dialog
  const openSharingDialog = (item: FileItem) => {
    setSharingItem(item)
    setSharingUsers(item.sharedWith || [])
    setIsSharingDialogOpen(true)
  }

  // Update sharing access
  const updateSharingAccess = async () => {
    if (!sharingItem || !user) return

    try {
      const response = await fetch('/api/files', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: sharingItem.id,
          type: sharingItem.type,
          sharedWith: sharingUsers,
          userId: user.uid,
          // Enable recursive sharing for folders
          recursive: sharingItem.type === 'folder'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to update sharing access')
      
      // Update the item in state
      setItems(prev => prev.map(i => 
        i.id === sharingItem.id ? {...i, sharedWith: sharingUsers} : i
      ))
      
      setIsSharingDialogOpen(false)
      toast.success(result.message || 'Sharing access updated successfully', {
        style: {
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
    } catch (error: any) {
      console.error('Sharing update error:', error)
      toast.error('Failed to update sharing access: ' + (error.message || 'Unknown error'), {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    }
  }

  // Remove file from shared with me view
  const removeSharedFile = async (item: FileItem) => {
    if (!user) return

    try {
      const response = await fetch('/api/files', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: item.id,
          type: item.type,
          userId: user.uid,
          action: 'remove_self'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to remove shared file')
      
      // Remove the item from sharedItems state
      setSharedItems(prev => prev.filter(i => i.id !== item.id))
      
      toast.success('File removed from shared with me successfully', {
        style: {
          backgroundColor: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0'
        }
      })
    } catch (error: any) {
      console.error('Remove shared file error:', error)
      toast.error('Failed to remove shared file: ' + (error.message || 'Unknown error'), {
        style: {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }
      })
    }
  }

  // Custom Dropdown Component as fallback
  const CustomDropdown = ({ item }: { item: FileItem }) => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
      <div className="relative">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
        
        {isOpen && (
          <div 
            ref={dropdownRef}
            className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
          >
            <div className="py-1">
              {item.type === 'file' && item.url && (
                <>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(item.url, '_blank')
                      setIsOpen(false)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </button>
                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(item.url!, item.name)
                      setIsOpen(false)
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </button>
                </>
              )}
              {item.createdBy === user?.uid ? (
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    startInlineRename(item)
                    setIsOpen(false)
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Rename
                </button>
              ) : null}
              {item.createdBy === user?.uid ? (
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    openSharingDialog(item)
                    setIsOpen(false)
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Sharing
                </button>
              ) : null}
              <button
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handleShowProperties(item)
                  setIsOpen(false)
                }}
              >
                <Info className="w-4 h-4 mr-2" />
                Properties
              </button>
              {item.createdBy !== user?.uid && (
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSharedFile(item)
                    setIsOpen(false)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </button>
              )}
              {item.createdBy === user?.uid ? (
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteItem(item.id, item.name, item.type)
                    setIsOpen(false)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Show loading state
  if (!user) {
    return (
      <RoleBasedLayout>
        <div className="flex items-center justify-center h-64">
          <div>Please log in to access file management</div>
        </div>
      </RoleBasedLayout>
    )
  }

  // Wrapper function for retry button
  const handleRetry = () => {
    fetchItems(currentFolderId)
  }

  return (
    <RoleBasedLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">File Management</h1>   
            <p className="text-muted-foreground">
              {showSharedTab 
                ? 'Manage your shared files' 
                : 'Upload and manage your files'
              }  
            </p>
          </div>
          
          {/* Search input */}
          <div className="w-full md:w-auto">
            <Input
              placeholder="Search files and folders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64"
            />
          </div>
          
          {/* Hide Upload and Create Folder buttons when in Shared With Me tab */}
          {!showSharedTab && (
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={isUploading}
                className='cursor-pointer'
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload File'}
              </Button>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              
              <Button 
                variant="outline" 
                onClick={() => setIsCreatingFolder(true)}
                className='cursor-pointer'
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                New Folder
              </Button>
              
              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  className="rounded-none border-0 cursor-pointer"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  className="rounded-none border-0 border-l cursor-pointer"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Show only view toggle in Shared With Me tab */}
          {showSharedTab && (
            <div className="flex border rounded-md overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                className="rounded-none border-0 cursor-pointer"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                className="rounded-none border-0 border-l cursor-pointer"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex border-b">
          <Button
            variant={showSharedTab ? 'ghost' : 'default'}
            className="rounded-b-none cursor-pointer"
            onClick={() => {
              setShowSharedTab(false)
              // Reset folder navigation when switching tabs
              setFolderPath([])
              setCurrentFolderId(null)
              // Clear cache when switching tabs to avoid stale data
              setFolderCache({})
              fetchItems(null)
            }}
          >
            My Files
          </Button>
          <Button
            variant={showSharedTab ? 'default' : 'ghost'}
            className="rounded-b-none cursor-pointer"
            onClick={() => {
              setShowSharedTab(true)
              // Reset folder navigation when switching tabs
              setFolderPath([])
              setCurrentFolderId(null)
              // Clear cache when switching tabs to avoid stale data
              setFolderCache({})
              fetchSharedItems(null)
            }}
          >
            Shared With Me
          </Button>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          <Button variant="link" className="p-0 h-auto cursor-pointer" onClick={navigateToRoot}>
            {showSharedTab ? 'Shared Root' : 'Root'}
          </Button>
          {folderPath.map((folder, index) => (
            <div key={folder.id} className="flex items-center gap-2">
              <span className="text-muted-foreground">/</span>
              <Button 
                variant="link" 
                className="p-0 h-auto cursor-pointer" 
                onClick={() => navigateToPath(index)}
              >
                {folder.name}
              </Button>
            </div>
          ))}
        </div>

        {/* Create Folder Dialog */}
        <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreatingFolder(false)} className='cursor-pointer hover:text-foreground'>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder}>Create</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {renamingItem && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Rename Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                />
                <Button onClick={handleRename}>Rename</Button>
                <Button variant="outline" onClick={() => setRenamingItem(null)} className='cursor-pointer hover:text-foreground'>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              <br />
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 cursor-pointer"
                onClick={handleRetry}
              >
                Retry
              </Button>``
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
              <h3 className="text-lg font-medium mb-2">
                {showSharedTab ? 'Loading Shared Files' : 'Loading Files'}
              </h3>
              <p className="text-muted-foreground">
                {showSharedTab 
                  ? 'Please wait while we load files and folders shared with you...' 
                  : 'Please wait while we load your files and folders...'}
              </p>
            </CardContent>
          </Card>
        ) : showSharedTab ? (
          // Shared Files View
          <>
            {getFilteredSharedItems().length === 0 && !error ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm ? 'No matching shared items found' : 'No shared items found'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm 
                      ? `No shared files or folders match your search for "${searchTerm}"` 
                      : 'No files or folders have been shared with you yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === 'list' ? (
              // Shared List View
              <Card>
                <CardContent className="p-0 file-table-container">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Owner</th>
                          <th className="text-left p-3 font-medium">Size</th>
                          <th className="text-left p-3 font-medium">Date Modified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredSharedItems().map((item) => (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="flex items-center gap-3 cursor-pointer"
                                  onClick={(e) => handleItemContainerClick(e, item)}
                                  onDoubleClick={(e) => handleItemContainerDoubleClick(e, item)}
                                >
                                  {item.type === 'folder' ? (
                                    <>
                                      <Folder className="w-5 h-5 text-primary" />
                                      {inlineRenameId === item.id ? (
                                        <input
                                          type="text"
                                          value={inlineRenameValue}
                                          onChange={(e) => setInlineRenameValue(e.target.value)}
                                          onBlur={() => handleInlineRename(item)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleInlineRename(item)
                                            } else if (e.key === 'Escape') {
                                              setInlineRenameId(null)
                                              setInlineRenameValue('')
                                            }
                                          }}
                                          autoFocus
                                          className="border rounded px-1 py-0.5"
                                          onClick={(e) => e.stopPropagation()}
                                          disabled={item.createdBy !== user?.uid}
                                        />
                                      ) : (
                                        <span className="font-medium hover:underline">
                                          {item.name}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <FileIcon className="w-5 h-5 text-muted-foreground" />
                                      {inlineRenameId === item.id ? (
                                        <input
                                          type="text"
                                          value={inlineRenameValue}
                                          onChange={(e) => setInlineRenameValue(e.target.value)}
                                          onBlur={() => handleInlineRename(item)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleInlineRename(item)
                                            } else if (e.key === 'Escape') {
                                              setInlineRenameId(null)
                                              setInlineRenameValue('')
                                            }
                                          }}
                                          autoFocus
                                          className="border rounded px-1 py-0.5"
                                          onClick={(e) => e.stopPropagation()}
                                          disabled={item.createdBy !== user?.uid}
                                        />
                                      ) : (
                                        <span className="font-medium">
                                          {item.name}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span>{item.creatorName}</span>
                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">
                                  {item.role}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              {getItemDisplaySize(item)}
                            </td>
                            <td className="p-3">
                              {formatDateSafely(item.createdAt)}
                            </td>
                            <td className="p-3 text-right">
                              <CustomDropdown item={item} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Shared Grid View
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {getFilteredSharedItems().map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow relative group border-0 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex flex-col items-center text-center">
                        <div 
                          className="flex flex-col items-center cursor-pointer w-full"
                          onClick={(e) => handleItemContainerClick(e, item)}
                          onDoubleClick={(e) => handleItemContainerDoubleClick(e, item)}
                        >
                          {item.type === 'folder' ? (
                            <Folder className="w-12 h-12 text-primary" />
                          ) : (
                            <FileIcon className="w-12 h-12 text-muted-foreground" />
                          )}
                          <div className="mt-2 w-full">
                            {inlineRenameId === item.id ? (
                              <input
                                type="text"
                                value={inlineRenameValue}
                                onChange={(e) => setInlineRenameValue(e.target.value)}
                                onBlur={() => handleInlineRename(item)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleInlineRename(item)
                                  } else if (e.key === 'Escape') {
                                    setInlineRenameId(null)
                                    setInlineRenameValue('')
                                  }
                                }}
                                autoFocus
                                className="w-full text-xs text-center border rounded px-1 py-0.5"
                                onClick={(e) => e.stopPropagation()}
                                disabled={item.createdBy !== user?.uid}
                              />
                            ) : (
                              <h3 
                                className="font-medium text-xs line-clamp-3 break-words text-center"
                                title={item.name}
                              >
                                {item.name}
                              </h3>
                            )}
                          </div>
                        </div>
                        <div className="absolute top-1 right-1">
                          <CustomDropdown item={item} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {getItemDisplaySize(item)}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {item.creatorName}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {getFilteredItems().length === 0 && !error ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchTerm ? 'No matching items found' : 'No items found'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? `No files or folders match your search for "${searchTerm}"` 
                      : 'You haven\'t uploaded any files or created folders yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : viewMode === 'list' ? (
              // List View with Custom Dropdown (File Explorer style)
              <Card>
                <CardContent className="p-0 file-table-container">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Name</th>
                          <th className="text-left p-3 font-medium">Size</th>
                          <th className="text-left p-3 font-medium">Date Modified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredItems().map((item) => (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="flex items-center gap-3 cursor-pointer"
                                  onClick={(e) => handleItemContainerClick(e, item)}
                                  onDoubleClick={(e) => handleItemContainerDoubleClick(e, item)}
                                >
                                  {item.type === 'folder' ? (
                                    <>
                                      <Folder className="w-5 h-5 text-primary" />
                                      {inlineRenameId === item.id ? (
                                        <input
                                          type="text"
                                          value={inlineRenameValue}
                                          onChange={(e) => setInlineRenameValue(e.target.value)}
                                          onBlur={() => handleInlineRename(item)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleInlineRename(item)
                                            } else if (e.key === 'Escape') {
                                              setInlineRenameId(null)
                                              setInlineRenameValue('')
                                            }
                                          }}
                                          autoFocus
                                          className="border rounded px-1 py-0.5"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <span className="font-medium hover:underline">
                                          {item.name}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <FileIcon className="w-5 h-5 text-muted-foreground" />
                                      {inlineRenameId === item.id ? (
                                        <input
                                          type="text"
                                          value={inlineRenameValue}
                                          onChange={(e) => setInlineRenameValue(e.target.value)}
                                          onBlur={() => handleInlineRename(item)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleInlineRename(item)
                                            } else if (e.key === 'Escape') {
                                              setInlineRenameId(null)
                                              setInlineRenameValue('')
                                            }
                                          }}
                                          autoFocus
                                          className="border rounded px-1 py-0.5"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <span className="font-medium">
                                          {item.name}
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              {getItemDisplaySize(item)}
                            </td>
                            <td className="p-3">
                              {formatDateSafely(item.createdAt)}
                            </td>
                            <td className="p-3 text-right">
                              <CustomDropdown item={item} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Grid View with Custom Dropdown (Windows File Explorer style)
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {getFilteredItems().map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow relative group border-0 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex flex-col items-center text-center">
                        <div 
                          className="flex flex-col items-center cursor-pointer w-full"
                          onClick={(e) => handleItemContainerClick(e, item)}
                          onDoubleClick={(e) => handleItemContainerDoubleClick(e, item)}
                        >
                          {item.type === 'folder' ? (
                            <Folder className="w-12 h-12 text-primary" />
                          ) : (
                            <FileIcon className="w-12 h-12 text-muted-foreground" />
                          )}
                          <div className="mt-2 w-full">
                            {inlineRenameId === item.id ? (
                              <input
                                type="text"
                                value={inlineRenameValue}
                                onChange={(e) => setInlineRenameValue(e.target.value)}
                                onBlur={() => handleInlineRename(item)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleInlineRename(item)
                                  } else if (e.key === 'Escape') {
                                    setInlineRenameId(null)
                                    setInlineRenameValue('')
                                  }
                                }}
                                autoFocus
                                className="w-full text-xs text-center border rounded px-1 py-0.5"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <h3 
                                className="font-medium text-xs line-clamp-3 break-words text-center"
                                title={item.name}
                              >
                                {item.name}
                              </h3>
                            )}
                          </div>
                        </div>
                        <div className="absolute top-1 right-1">
                          <CustomDropdown item={item} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {getItemDisplaySize(item)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* Properties Dialog */}
        <Dialog open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Properties</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {selectedItem.type === 'folder' ? (
                    <Folder className="w-8 h-8 text-primary" />
                  ) : (
                    <FileIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="font-medium">{selectedItem.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{selectedItem.type}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{getItemDisplaySize(selectedItem)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDateTimeSafely(selectedItem.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created by:</span>
                    <span>{selectedItem.creatorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shared with:</span>
                    <span>
                      {selectedItem.sharedWith && selectedItem.sharedWith.length > 0 
                        ? `${selectedItem.sharedWith.length} user(s)` 
                        : 'Not shared'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Sharing Dialog */}
        <Dialog open={isSharingDialogOpen} onOpenChange={setIsSharingDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sharing Access</DialogTitle>
            </DialogHeader>
            {sharingItem && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {sharingItem.type === 'folder' ? (
                    <Folder className="w-8 h-8 text-primary" />
                  ) : (
                    <FileIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                  <div>
                    <h3 className="font-medium">{sharingItem.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{sharingItem.type}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Share with users:</label>
                  <MultiSelect
                    options={allUsers.map(user => ({
                      value: user.id,
                      label: user.name,
                      description: user.role
                    }))}
                    selected={sharingUsers}
                    onChange={setSharingUsers}
                    placeholder="Select users to share with"
                  />
                  
                  <p className="text-xs text-muted-foreground">
                    Select users to share this {sharingItem.type} with. Owners can always access their files.
                  </p>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSharingDialogOpen(false)} className='cursor-pointer hover:text-foreground'>
                    Cancel
                  </Button>
                  <Button onClick={updateSharingAccess} className='cursor-pointer'>
                    Update Sharing
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className='cursor-pointer hover:text-foreground'>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteItem}
                className='cursor-pointer'
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </RoleBasedLayout>
  )
}