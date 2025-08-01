"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MemberPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to member dashboard
    router.push("/member/dashboard")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to Member Dashboard...</h1>
      </div>
    </div>
  )
}
