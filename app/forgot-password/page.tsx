"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Mail, User } from "lucide-react"
import Link from "next/link"
import { generateResetToken } from "@/utils/auth"

export default function ForgotPassword() {
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Get stored users
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      const storedAdmins = JSON.parse(localStorage.getItem("gym-admins") || "[]")
      const allUsers = [...storedMembers, ...storedAdmins]

      // Find user by username
      const user = allUsers.find((user: any) => user.username === username)

      if (!user) {
        toast({
          title: "User Not Found",
          description: "No account found with this username.",
          variant: "destructive",
        })
        return
      }

      // Generate reset token
      const resetToken = generateResetToken()
      const resetTokenData = {
        token: resetToken,
        username: user.username,
        email: user.email,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
        used: false,
        createdAt: Date.now(),
      }

      // Store reset token
      const existingTokens = JSON.parse(localStorage.getItem("reset-tokens") || "[]")
      const updatedTokens = [...existingTokens, resetTokenData]
      localStorage.setItem("reset-tokens", JSON.stringify(updatedTokens))

      // In a real app, this would send an email
      // For demo purposes, we'll log the reset link
      const resetLink = `${window.location.origin}/reset-password?token=${resetToken}`
      console.log("🔗 Password Reset Link:", resetLink)
      console.log("📧 Email would be sent to:", user.email)

      setEmailSent(true)
      toast({
        title: "Reset Email Sent",
        description: `Password reset instructions have been sent to ${user.email}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while processing your request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              We've sent password reset instructions to your email address. The link will expire in 1 hour.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Didn't receive the email? Check your spam folder or try again.
            </div>
            <div className="flex flex-col space-y-2">
              <Button onClick={() => setEmailSent(false)} variant="outline">
                Try Different Username
              </Button>
              <Link href="/login">
                <Button className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your username and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              <ArrowLeft className="mr-1 inline h-3 w-3" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
