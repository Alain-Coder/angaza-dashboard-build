'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface User extends FirebaseUser {
  role?: string
  displayName: string | null
  photoURL: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  setUser: React.Dispatch<React.SetStateAction<User | null>>
  // Add a function to log login events explicitly
  logLoginEvent: (userId: string, userName: string) => void
  // Add a function to log logout events
  logLogoutEvent: (userId: string, userName: string) => void
  // Add a function to log audit events
  logAuditEvent: (action: string, resource: string, userId?: string, userName?: string) => Promise<void>
  // Add a function to update user profile including photo
  updateUserProfile: (userData: { name?: string; photoURL?: string }) => Promise<void>
  // Add a function to handle logout with proper cleanup
  handleLogout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logLoginEvent: () => {},
  logLogoutEvent: () => {},
  logAuditEvent: async () => {},
  updateUserProfile: async () => {},
  handleLogout: async () => {}
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Function to log audit events
  const logAuditEvent = async (action: string, resource: string, userId?: string, userName?: string) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        timestamp: Timestamp.now(),
        user: userName || 'Unknown User',
        action,
        resource,
        ip: '127.0.0.1', // In a real app, you would get the actual IP address
        userId: userId || 'unknown'
      })
    } catch (error: any) {
      console.error('Error logging audit event:', error)
      // Handle permission errors specifically
      if (error.code === 'permission-denied') {
        console.warn('Audit logging failed due to insufficient permissions.')
      }
    }
  }

  // Function to log login events explicitly
  const logLoginEvent = (userId: string, userName: string) => {
    logAuditEvent('Login', 'Dashboard', userId, userName)
  }

  // Function to log logout events
  const logLogoutEvent = (userId: string, userName: string) => {
    logAuditEvent('Logout', 'Dashboard', userId, userName)
  }

  // Function to handle logout with proper cleanup
  const handleLogout = async () => {
    try {
      // Log the logout event explicitly if we have user data
      if (user) {
        await logLogoutEvent(user.uid, user.displayName || user.email || 'Unknown User')
      }
      
      // Clear user state
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, still clear user state
      setUser(null)
    }
  }

  // Function to update user profile including photo
  const updateUserProfile = async (userData: { name?: string; photoURL?: string }) => {
    if (!user) return;

    try {
      // Update user state
      setUser(prevUser => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          ...(userData.name && { displayName: userData.name }),
          ...(userData.photoURL && { photoURL: userData.photoURL })
        };
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('Firebase user authenticated:', firebaseUser.uid, firebaseUser.email)
        // User is signed in
        try {
          // Fetch user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            console.log('User data from Firestore:', userData)
            const userWithRole = {
              ...firebaseUser,
              role: userData.role,
              displayName: userData.displayName || userData.name || firebaseUser.displayName,
              photoURL: userData.photoURL || firebaseUser.photoURL,
            }
            setUser(userWithRole)
          } else {
            console.log('User document does not exist in Firestore for UID:', firebaseUser.uid)
            // Check if this might be the system admin by email
            if (firebaseUser.email === 'admin@angazafoundation.org') {
              console.log('Setting user as system admin based on email')
              const userWithRole = {
                ...firebaseUser,
                role: 'system admin',
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              }
              setUser(userWithRole)
            } else {
              // If user document doesn't exist and not system admin, set user with undefined role
              setUser({
                ...firebaseUser,
                role: undefined, // Explicitly set as undefined to trigger error in login
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              })
            }
          }
        } catch (error: any) {
          console.error('Error fetching user data:', error)
          // Check if this might be the system admin by email despite the error
          if (firebaseUser.email === 'admin@angazafoundation.org') {
            console.log('Setting user as system admin based on email despite error')
            const userWithRole = {
              ...firebaseUser,
              role: 'system admin',
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            }
            setUser(userWithRole)
          } else {
            // If there's an error and not system admin, set user with undefined role
            setUser({
              ...firebaseUser,
              role: undefined, // Explicitly set as undefined to trigger error in login
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            })
          }
        }
      } else {
        // User is signed out
        console.log('User is signed out')
        setUser(null)
      }
      setLoading(false)
    })

    // Cleanup function
    return () => {
      unsubscribe()
    }
  }, []) // Empty dependency array to run only once

  const value = {
    user,
    loading,
    setUser,
    logLoginEvent,
    logLogoutEvent,
    logAuditEvent,
    updateUserProfile,
    handleLogout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}