import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/AuthContext"
import { ErrorBoundary } from "@/components/error-boundary"

// Import polyfills to suppress deprecation warnings
import "@/lib/polyfills"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Core Factory",
  description: "Gym management system",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ThemeProvider defaultTheme="dark" storageKey="core-factory-theme">
          <AuthProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
