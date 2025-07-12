// Authentication utility functions

export interface User {
  id: string
  username: string
  name: string
  email: string
  role: "admin" | "member"
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface ResetToken {
  token: string
  username: string
  email: string
  expiresAt: number
  used: boolean
  createdAt: number
  usedAt?: number
}

// Hash password function (in production, use bcrypt on backend)
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Password validation
export const validatePassword = (password: string) => {
  const minLength = password.length >= 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  return {
    minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar,
    isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
  }
}

// Username validation
export const validateUsername = (username: string) => {
  const minLength = username.length >= 3
  const maxLength = username.length <= 20
  const validChars = /^[a-zA-Z0-9_.-]+$/.test(username)
  const noSpaces = !username.includes(" ")

  return {
    minLength,
    maxLength,
    validChars,
    noSpaces,
    isValid: minLength && maxLength && validChars && noSpaces,
  }
}

// Check if username is unique
export const checkUsernameUnique = (username: string, excludeId?: string): boolean => {
  const existingMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
  const existingAdmins = JSON.parse(localStorage.getItem("gym-admins") || "[]")
  const allUsers = [...existingMembers, ...existingAdmins]

  return !allUsers.some((user: any) => user.username.toLowerCase() === username.toLowerCase() && user.id !== excludeId)
}

// Generate secure reset token
export const generateResetToken = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString()
  )
}

// Get current user from session
export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null

  try {
    const userSession = localStorage.getItem("current-user")
    return userSession ? JSON.parse(userSession) : null
  } catch {
    return null
  }
}

// Set current user session
export const setCurrentUser = (user: User): void => {
  localStorage.setItem("current-user", JSON.stringify(user))
}

// Clear current user session
export const clearCurrentUser = (): void => {
  localStorage.removeItem("current-user")
}

// Verify user credentials
export const verifyCredentials = async (username: string, password: string): Promise<User | null> => {
  const hashedPassword = await hashPassword(password)

  // Check admin credentials
  const storedAdmins = JSON.parse(localStorage.getItem("gym-admins") || "[]")
  const admin = storedAdmins.find((admin: any) => admin.username === username && admin.password === hashedPassword)

  if (admin) {
    return {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: "admin",
    }
  }

  // Check member credentials
  const storedMembers = JSON.parse(localStorage.getItem("gym-members") || "[]")
  const member = storedMembers.find((member: any) => member.username === username && member.password === hashedPassword)

  if (member) {
    return {
      id: member.id,
      username: member.username,
      name: member.name,
      email: member.email,
      role: "member",
    }
  }

  return null
}

// Initialize default admin account (legacy function - kept for compatibility)
export const initializeDefaultAdmin = (): void => {
  const existingAdmins = JSON.parse(localStorage.getItem("gym-admins") || "[]")

  if (existingAdmins.length === 0) {
    // Create default admin account
    hashPassword("Admin123!").then((hashedPassword) => {
      const defaultAdmin = {
        id: "admin-1",
        name: "System Administrator",
        email: "admin@corefactory.com",
        username: "admin",
        password: hashedPassword,
        role: "admin",
        createdAt: new Date().toISOString(),
        isDefault: true,
      }

      localStorage.setItem("gym-admins", JSON.stringify([defaultAdmin]))
    })
  }
}
