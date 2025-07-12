"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { User, Settings, LogOut, Key, Shield } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export function UserDropdown() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const auth = useAuth()

  // Return null if not authenticated
  if (!auth.user) {
    return null
  }

  // Get user info from auth context
  const currentUser = {
    name: auth.userProfile?.full_name || auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0] || "User",
    email: auth.user.email || "No email",
    role: auth.userProfile?.role ? auth.userProfile.role.charAt(0).toUpperCase() + auth.userProfile.role.slice(1) : 'Member',
    initials: (auth.userProfile?.full_name || auth.user.user_metadata?.full_name || auth.user.email || "User")
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || "U",
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true)

      await auth.signOut()

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })

      // Redirect will be handled by the auth context
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Logout Failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">{currentUser.initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{currentUser.email}</p>
            <p className="text-xs leading-none text-muted-foreground">{currentUser.role}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={auth.isAdmin ? "/admin/profile" : "/member/profile"} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/change-password" className="cursor-pointer">
            <Key className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </Link>
        </DropdownMenuItem>
        {auth.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/home-config" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={auth.isAdmin ? "/admin/dashboard" : "/member/dashboard"} className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoading} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? "Logging out..." : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
