'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Image from 'next/image'

export default function LoginFormContent({ redirectUrl }: { redirectUrl: string | null }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading, logLoginEvent } = useAuth()

  // Handle redirection when user is authenticated
  useEffect(() => {
    if (!authLoading && user) {
      console.log('User authenticated, handling redirection. Role:', user.role)
      
      // If user role is undefined, show error and don't redirect
      if (user.role === undefined) {
        setError('User role not found. Please contact your system administrator.')
        setRedirecting(false)
        return
      }
      
      // Set redirecting state to show loading indicator
      setRedirecting(true)
      
      console.log('Redirect URL from params:', redirectUrl)
      
      // Perform redirection after a short delay to ensure state updates
      const timer = setTimeout(() => {
        try {
          // If there's a redirect URL, use that; otherwise use role-based redirection
          if (redirectUrl && redirectUrl !== '/' && !redirectUrl.includes('login')) {
            console.log('Redirecting to:', redirectUrl)
            // Ensure the redirect URL is a valid internal path
            if (redirectUrl.startsWith('/')) {
              router.push(redirectUrl)
            } else {
              // Fallback to role-based redirection
              redirectToRoleDashboard(user.role)
            }
          } else {
            // Redirect based on user role
            console.log('Using role-based redirection for role:', user.role)
            redirectToRoleDashboard(user.role)
          }
        } catch (err) {
          console.error('Redirection error:', err)
          // Fallback to dashboard if redirection fails
          router.push('/dashboard')
        }
      }, 300) // Increased delay to ensure proper loading
      
      return () => clearTimeout(timer)
    } else if (!authLoading && !user) {
      // If user is not authenticated and we're not loading, ensure redirecting is false
      setRedirecting(false)
    }
  }, [user, authLoading, router, redirectUrl])

  // Helper function to redirect based on user role
  const redirectToRoleDashboard = (role: string | undefined) => {
    if (!role) {
      router.push('/dashboard')
      return
    }
    
    switch (role.toLowerCase()) {
      case 'system admin':
        router.push('/system-admin')
        break
      case 'board':
        router.push('/board')
        break
      case 'executive director':
        router.push('/executive-director')
        break
      case 'finance lead':
        router.push('/finance-lead')
        break
      case 'programs lead':
        router.push('/programs-lead')
        break
      case 'project officer':
        router.push('/project-officer')
        break
      case 'office assistant':
        router.push('/office-assistant')
        break
      default:
        router.push('/dashboard')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setRedirecting(false) // Reset redirecting state on new login attempt

    try {
      console.log('Attempting to sign in with email:', email)
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const firebaseUser = userCredential.user
      console.log('Sign in successful, user:', firebaseUser.uid)
      
      // Log the login event explicitly
      logLoginEvent(firebaseUser.uid, firebaseUser.email || 'Unknown User')
      
      // Note: The redirection will be handled by the useEffect above
      // which will trigger when the auth context updates the user state
    } catch (err: any) {
      console.error('Login error:', err)
      // Provide user-friendly error messages
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Invalid email address format.')
          break
        case 'auth/user-disabled':
          setError('This account has been disabled. Please contact your system administrator.')
          break
        case 'auth/user-not-found':
          setError('No account found with this email address.')
          break
        case 'auth/wrong-password':
          setError('Incorrect email or password. Please try again.')
          break
        case 'auth/too-many-requests':
          setError('Too many failed login attempts. Please try again later or contact your system administrator.')
          break
        default:
          setError('Failed to log in. Please check your credentials and try again.')
      }
      setLoading(false)
      setRedirecting(false) // Ensure redirecting is false on error
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await sendPasswordResetEmail(auth, resetEmail)
      setResetSuccess(true)
    } catch (err: any) {
      console.error('Password reset error:', err)
      switch (err.code) {
        case 'auth/invalid-email':
          setError('Invalid email address format.')
          break
        case 'auth/user-not-found':
          setError('No account found with this email address.')
          break
        default:
          setError('Failed to send password reset email. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Show loading spinner when redirecting
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Signing you in...</p>
        </div>
      </div>
    )
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Image 
              src="/Angaza logo.png" 
              alt="Angaza Foundation Logo" 
              width={150} 
              height={50} 
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && !forgotPasswordOpen && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@angazafoundation.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setForgotPasswordOpen(true)
                setResetEmail(email)
                setError('')
                setResetSuccess(false)
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          
          {resetSuccess ? (
            <div className="py-4 space-y-4">
              <Alert>
                <AlertDescription>
                  Password reset email sent successfully! Please check your inbox.
                </AlertDescription>
              </Alert>
              <Alert>
                <AlertDescription>
                  <strong>Notice:</strong> If you don't see the email in your inbox, please check your spam/junk folder.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handlePasswordReset} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@angazafoundation.org"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setForgotPasswordOpen(false)
                      setError('')
                      setResetSuccess(false)
                    }}
                    className='cursor-pointer'
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className='cursor-pointer' disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
          
          {resetSuccess && (
            <DialogFooter>
              <Button 
                onClick={() => {
                  setForgotPasswordOpen(false)
                  setError('')
                  setResetSuccess(false)
                }}
                className='cursor-pointer'
              >
                Back to Login
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}