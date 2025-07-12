"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Lock, CheckCircle, XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { validatePassword, hashPassword } from "@/utils/auth"

export default function ResetPassword() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const token = searchParams.get("token")

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      return
    }

    // Validate token
    const resetTokens = JSON.parse(localStorage.getItem("reset-tokens") || "[]")
    const tokenData = resetTokens.find((t: any) => t.token === token)

    if (!tokenData) {
      setTokenValid(false)
      return
    }

    if (tokenData.used) {
      setTokenValid(false)
      toast({
        title: "Invalid Token",
        description: "This reset link has already been used.",
        variant: "destructive",
      })
      return
    }

    if (Date.now() > tokenData.expiresAt) {
      setTokenValid(false)
      toast({
        title: "Expired Token",
        description: "This reset link has expired. Please request a new one.",
        variant: "destructive",
      })
      return
    }

    setTokenValid(true)
    setUserInfo(tokenData)
  }, [token, toast])

  const passwordValidation = validatePassword(password)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordValidation.isValid) {
      toast({
        title: "Invalid Password",
        description: "Please ensure your password meets all requirements.",
        variant: "destructive",
      })
      return
    }

    if (!passwordsMatch) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both passwords are identical.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Hash the new password
      const hashedPassword = await hashPassword(password)

      // Update user password
      const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
      const storedAdmins = JSON.parse(localStorage.getItem("gym-admins") || "[]")

      // Find and update the user
      let userUpdated = false

      const updatedMembers = storedMembers.map((member: any) => {
        if (member.username === userInfo.username) {
          userUpdated = true
          return { ...member, password: hashedPassword }
        }
        return member
      })

      const updatedAdmins = storedAdmins.map((admin: any) => {
        if (admin.username === userInfo.username) {
          userUpdated = true
          return { ...admin, password: hashedPassword }
        }
        return admin
      })

      if (userUpdated) {
        localStorage.setItem("gym-members", JSON.stringify(updatedMembers))
        localStorage.setItem("gym-admins", JSON.stringify(updatedAdmins))

        // Mark token as used
        const resetTokens = JSON.parse(localStorage.getItem("reset-tokens") || "[]")
        const updatedTokens = resetTokens.map((t: any) =>
          t.token === token ? { ...t, used: true, usedAt: Date.now() } : t,
        )
        localStorage.setItem("reset-tokens", JSON.stringify(updatedTokens))

        toast({
          title: "Password Reset Successful",
          description: "Your password has been updated successfully. You can now log in with your new password.",
        })

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        throw new Error("User not found")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while resetting your password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenValid === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription>This password reset link is invalid, expired, or has already been used.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <Link href="/forgot-password">
                <Button className="w-full">Request New Reset Link</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full bg-transparent">
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
          <CardTitle className="text-2xl font-bold text-center">Set New Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password for <strong>{userInfo?.username}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Password Requirements */}
            {password && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Password Requirements:</Label>
                <div className="space-y-1 text-sm">
                  <div
                    className={`flex items-center ${passwordValidation.minLength ? "text-green-600" : "text-red-600"}`}
                  >
                    {passwordValidation.minLength ? (
                      <CheckCircle className="mr-2 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-2 h-3 w-3" />
                    )}
                    At least 8 characters
                  </div>
                  <div
                    className={`flex items-center ${passwordValidation.hasUpperCase ? "text-green-600" : "text-red-600"}`}
                  >
                    {passwordValidation.hasUpperCase ? (
                      <CheckCircle className="mr-2 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-2 h-3 w-3" />
                    )}
                    One uppercase letter
                  </div>
                  <div
                    className={`flex items-center ${passwordValidation.hasLowerCase ? "text-green-600" : "text-red-600"}`}
                  >
                    {passwordValidation.hasLowerCase ? (
                      <CheckCircle className="mr-2 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-2 h-3 w-3" />
                    )}
                    One lowercase letter
                  </div>
                  <div
                    className={`flex items-center ${passwordValidation.hasNumbers ? "text-green-600" : "text-red-600"}`}
                  >
                    {passwordValidation.hasNumbers ? (
                      <CheckCircle className="mr-2 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-2 h-3 w-3" />
                    )}
                    One number
                  </div>
                  <div
                    className={`flex items-center ${passwordValidation.hasSpecialChar ? "text-green-600" : "text-red-600"}`}
                  >
                    {passwordValidation.hasSpecialChar ? (
                      <CheckCircle className="mr-2 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-2 h-3 w-3" />
                    )}
                    One special character
                  </div>
                  {confirmPassword && (
                    <div className={`flex items-center ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                      {passwordsMatch ? <CheckCircle className="mr-2 h-3 w-3" /> : <XCircle className="mr-2 h-3 w-3" />}
                      Passwords match
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !passwordValidation.isValid || !passwordsMatch}
            >
              {isLoading ? "Updating Password..." : "Update Password"}
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
