import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'

// Error boundary component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export const metadata: Metadata = {
  title: {
    default: 'Angaza Foundation Dashboard',
    template: '%s | Angaza Foundation Dashboard',
  },
  description: 'Internal dashboard for Angaza Foundation staff to manage operations',
  metadataBase: new URL('https://dashboard.angazafoundation.org'),
  openGraph: {
    title: 'Angaza Foundation Dashboard',
    description: 'Internal dashboard for Angaza Foundation staff to manage operations',
    type: 'website',
  },
  robots: {
    index: false, // Internal dashboard should not be indexed
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}