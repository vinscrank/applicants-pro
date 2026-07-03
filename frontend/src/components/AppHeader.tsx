"use client"

import { useAuth } from "@/context/AuthContext"

export default function AppHeader() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <header className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-sm text-gray-600">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={() => logout()}
        className="border px-3 py-1 rounded"
      >
        Logout
      </button>
    </header>
  )
}
