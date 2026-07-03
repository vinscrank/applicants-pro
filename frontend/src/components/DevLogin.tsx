"use client"

import { useState } from "react"

export default function DevLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_JAVA_API_URL}/api/v2/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    )

    if (!res.ok) {
      setError("Login failed")
      return
    }

    const data = await res.json()
    localStorage.setItem("accessToken", data.accessToken)
    window.location.reload()
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-2 max-w-sm">
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
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 rounded"
        required
      />
      <button type="submit" className="bg-black text-white p-2 rounded">
        Login
      </button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  )
}
