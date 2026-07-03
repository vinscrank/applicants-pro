"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"

export default function AuthForm() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      if (mode === "login") {
        await login(email, password)
      } else {
        await register(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm">
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`px-3 py-1 rounded ${mode === "login" ? "bg-black text-white" : "border"}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`px-3 py-1 rounded ${mode === "register" ? "bg-black text-white" : "border"}`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          minLength={8}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white p-2 rounded disabled:opacity-50"
        >
          {submitting ? "..." : mode === "login" ? "Login" : "Register"}
        </button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </div>
  )
}
