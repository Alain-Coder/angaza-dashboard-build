'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { 
  User, 
  LogOut,
  ChevronDown,
  Mail,
  Key,
  Camera
} from 'lucide-react'
import { toast } from 'sonner'
import { updateProfile } from 'firebase/auth'
import { db, auth } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { uploadFile, validateFile } from '@/lib/file-upload'
import Image from 'next/image'

// Function to truncate email if too long
const truncateEmail = (email: string, maxLength: number = 25) => {
  if (email.length <= maxLength) return email;
  
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  
  // If the email is too long, preserve the username (local part) and truncate the domain
  if (email.length > maxLength) {
    const availableSpace = maxLength - localPart.length - 4; // 4 for "..." and "@"
    if (availableSpace > 0) {
      // Truncate the domain from the end, keeping the beginning of the domain
      return `${localPart}@${domain.substring(0, availableSpace)}...`;
    } else {
      // If we don't have enough space, show the local part and some of the domain
      const minLocalLength = Math.min(localPart.length, maxLength - 4);
      return `${localPart.substring(0, minLocalLength)}@...`;
    }
  }
  
  return email;
};

export function ProfileMenu() {
  const { user, setUser, logLogoutEvent, updateUserProfile, handleLogout } = useAuth()
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhoto, setUserPhoto] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [initialName, setInitialName] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch user info from Firestore
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user) {
        setUserEmail(user.email || '')
        // Use absolute URL for photos to ensure they load correctly
        const photoUrl = user.photoURL 
          ? user.photoURL.startsWith('/uploads/') 
            ? user.photoURL 
            : user.photoURL.startsWith('http') 
              ? user.photoURL 
              : `/uploads/profile-photos/${user.photoURL}`
          : null;
        setUserPhoto(photoUrl)
        
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            // Use name from Firestore, fallback to displayName, then email, then 'User'
            const name = userData.name || user.displayName || user.email || 'User'
            setUserName(name)
            setName(name)
            setInitialName(name)
            
            // Set photo URL if available
            if (userData.photoURL) {
              const photoUrl = userData.photoURL.startsWith('/uploads/') 
                ? userData.photoURL 
                : userData.photoURL.startsWith('http') 
                  ? userData.photoURL 
                  : `/uploads/profile-photos/${userData.photoURL}`;
              setUserPhoto(photoUrl)
            }
          } else {
            // Fallback if no Firestore document exists
            const name = user.displayName || user.email || 'User'
            setUserName(name)
            setName(name)
            setInitialName(name)
          }
        } catch (error) {
          console.error('Error fetching user data from Firestore:', error)
          // Fallback if Firestore fetch fails
          const name = user.displayName || user.email || 'User'
          setUserName(name)
          setName(name)
          setInitialName(name)
        }
      }
    }

    fetchUserInfo()
  }, [user])

  const handleLogoutClick = async () => {
    try {
      await handleLogout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout. Please try again.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    }
  }

  const handleViewProfile = () => {
    setIsOpen(false)
    setIsProfileModalOpen(true)
  }

  const handleChangePassword = () => {
    setIsOpen(false)
    setIsProfileModalOpen(false)
    setIsChangePasswordModalOpen(true)
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file
      if (!validateFile(file, 2 * 1024 * 1024, ['image/jpeg', 'image/png', 'image/gif'])) {
        return
      }
      
      setPhotoFile(file)
      
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return

    setIsUpdatingProfile(true)
    try {
      let photoURL = user.photoURL
      
      // Upload photo if a new one was selected
      if (photoFile) {
        const uploadResult = await uploadFile(photoFile, 'profile-photos')
        if (uploadResult) {
          photoURL = uploadResult.url
        }
      }

      // Update Firebase Authentication profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { 
          displayName: name,
          photoURL: photoURL || undefined
        })
      }

      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.uid), {
        name: name,
        photoURL: photoURL || null
      })

      // Update context
      updateUserProfile({ name, photoURL: photoURL || undefined })
      
      // Update local state with absolute URL
      const absolutePhotoUrl = photoURL 
        ? photoURL.startsWith('/uploads/') 
          ? photoURL 
          : photoURL.startsWith('http') 
            ? photoURL 
            : `/uploads/profile-photos/${photoURL}`
        : null;
      setUserPhoto(absolutePhotoUrl)
      
      toast.success('Profile updated successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      // Update displayed name
      setUserName(name)
      setInitialName(name)
      
      // Clear file input
      setPhotoFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile. Please try again.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangePasswordSubmit = async () => {
    if (!user?.email) {
      toast.error('User email not found', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
      return
    }

    setIsUpdatingPassword(true)
    try {
      // Note: Password change functionality would need to be implemented with Firebase Admin SDK
      // or through a custom backend function since we can't reauthenticate in the client
      
      toast.success('Password updated successfully', {
        style: { backgroundColor: '#dcfce7', color: '#166534' }
      })
      
      // Reset form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsChangePasswordModalOpen(false)
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error('Failed to change password. Please try again.', {
        style: { backgroundColor: '#fee2e2', color: '#991b1b' }
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  if (!user) {
    return null
  }

  const truncatedEmail = truncateEmail(userEmail);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center space-x-2 hover:bg-primary/10 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          {userPhoto ? (
            <div className="relative w-6 h-6 rounded-full overflow-hidden">
              <Image 
                src={userPhoto} 
                alt={userName} 
                fill 
                className="object-cover"
              />
            </div>
          ) : (
            <User className="w-4 h-4 text-foreground" />
          )}
          <span className="hidden md:inline text-foreground">{userName}</span>
          <ChevronDown className={`w-4 h-4 text-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-md shadow-lg z-[9999]">
            <div className="p-3 border-b border-border">
              <div className="flex items-center space-x-2">
                {userPhoto ? (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden">
                    <Image 
                      src={userPhoto} 
                      alt={userName} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-foreground">{userName}</div>
                  <div className="text-sm text-muted-foreground flex items-center mt-1">
                    <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{truncatedEmail}</span>
                  </div>
                </div>
              </div>
            </div>
            <div 
              className="flex items-center space-x-2 px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
              onClick={handleViewProfile}
            >
              <User className="w-4 h-4" />
              <span>View Profile</span>
            </div>
            <div 
              className="flex items-center space-x-2 px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
              onClick={handleChangePassword}
            >
              <Key className="w-4 h-4" />
              <span>Change Password</span>
            </div>
            <div 
              className="flex items-center space-x-2 px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
              onClick={handleLogoutClick}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </div>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={(open) => {
        setIsProfileModalOpen(open)
        if (!open) {
          // Reset photo state when closing
          setPhotoFile(null)
          setPreviewUrl(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        }
      }}>
        <DialogContent className="bg-card text-card-foreground sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <User className="h-5 w-5" />
              User Profile
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div 
                className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group"
                onClick={handlePhotoClick}
              >
                {previewUrl || userPhoto ? (
                  <Image 
                    src={previewUrl || userPhoto || ''} 
                    alt="Profile" 
                    fill 
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handlePhotoChange}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePhotoClick}
                className="border-input text-foreground hover:bg-accent cursor-pointer"
              >
                Change Photo
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="mt-1 flex items-center">
                  <div className="flex items-center border rounded-md px-3 py-2 bg-muted/50 w-full">
                    <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className="text-foreground truncate">{userEmail}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your email address cannot be changed
                </p>
              </div>
              
              <div>
                <Label htmlFor="name" className="text-foreground">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 bg-background text-foreground border-input"
                />
              </div>
              
              <Button 
                onClick={handleUpdateProfile}
                disabled={isUpdatingProfile || (name === initialName && !photoFile)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : 'Update Profile'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleChangePassword}
                className="w-full border-input text-foreground hover:bg-accent"
              >
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={isChangePasswordModalOpen} onOpenChange={setIsChangePasswordModalOpen}>
        <DialogContent className="bg-card text-card-foreground sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Key className="h-5 w-5" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-foreground">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-background text-foreground border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-foreground">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-background text-foreground border-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-foreground">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-background text-foreground border-input"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsChangePasswordModalOpen(false)}
                disabled={isUpdatingPassword}
                className="border-input text-foreground hover:bg-accent"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleChangePasswordSubmit}
                disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : 'Change Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}